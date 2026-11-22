package vpn

import (
	"bufio"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// OpenVPNEngine manages an OpenVPN subprocess.
type OpenVPNEngine struct {
	mu         sync.Mutex
	cmd        *exec.Cmd
	mgmtConn   net.Conn
	tmpDir     string
	cancelDone chan struct{}
}

func NewOpenVPNEngine() *OpenVPNEngine {
	return &OpenVPNEngine{}
}

func (e *OpenVPNEngine) Name() string { return string(EngineOpenVPN) }

// Available checks if openvpn binary is reachable.
func (e *OpenVPNEngine) Available() bool {
	return e.FindBinary() != ""
}

// FindBinary searches for the openvpn executable in known directories and PATH.
func (e *OpenVPNEngine) FindBinary() string {
	if runtime.GOOS == "windows" {
		// 1. Check %LOCALAPPDATA%\Veilora\bin\openvpn.exe
		if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
			candidate := filepath.Join(localAppData, "Veilora", "bin", "openvpn.exe")
			if isExecutableFile(candidate) {
				return candidate
			}
		}
		// 2. Check standard Program Files installation paths
		for _, pf := range []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)")} {
			if pf != "" {
				candidate := filepath.Join(pf, "OpenVPN", "bin", "openvpn.exe")
				if isExecutableFile(candidate) {
					return candidate
				}
			}
		}
		// 3. Check next to current executable
		if exe, err := os.Executable(); err == nil {
			candidate := filepath.Join(filepath.Dir(exe), "bin", "openvpn.exe")
			if isExecutableFile(candidate) {
				return candidate
			}
		}
	}

	if runtime.GOOS == "darwin" {
		for _, candidate := range []string{"/opt/homebrew/sbin/openvpn", "/usr/local/sbin/openvpn"} {
			if isExecutableFile(candidate) {
				return candidate
			}
		}
	}
	if runtime.GOOS == "linux" {
		for _, candidate := range []string{"/usr/sbin/openvpn", "/usr/local/sbin/openvpn"} {
			if isExecutableFile(candidate) {
				return candidate
			}
		}
	}
	// 4. Check system PATH
	if path, err := exec.LookPath(e.binaryName()); err == nil {
		return path
	}

	return ""
}

func (e *OpenVPNEngine) binaryName() string {
	if runtime.GOOS == "windows" {
		return "openvpn.exe"
	}
	return "openvpn"
}

// Connect decodes the base64 OpenVPN config, writes it to a temp file,
// spawns the openvpn process with a management interface, and monitors state.
func (e *OpenVPNEngine) Connect(ovpnConfigB64 []byte, statusCh chan<- Status) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.cmd != nil {
		return fmt.Errorf("openvpn: already connected")
	}

	configData, err := base64.StdEncoding.DecodeString(string(ovpnConfigB64))
	if err != nil {
		// Config might already be plain text.
		configData = ovpnConfigB64
	}

	tmpDir, err := os.MkdirTemp("", "veilora-vpn-*")
	if err != nil {
		return fmt.Errorf("openvpn: create temp dir: %w", err)
	}
	e.tmpDir = tmpDir

	configPath := filepath.Join(tmpDir, "client.ovpn")
	if err := os.WriteFile(configPath, configData, 0600); err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn: write config: %w", err)
	}

	// Find a free port for the management interface.
	mgmtPort, err := freePort()
	if err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn: find management port: %w", err)
	}

	args := []string{
		"--config", configPath,
		"--management", "127.0.0.1", fmt.Sprintf("%d", mgmtPort),
		"--management-hold",
		"--connect-retry", "3",
		"--connect-retry-max", "5",
		"--verb", "3",
	}

	if runtime.GOOS != "windows" {
		args = append(args, "--script-security", "1")
	}

	binPath := e.FindBinary()
	if binPath == "" {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn binary not found")
	}

	cmd := hiddenCommand(binPath, args...) // #nosec G204 -- fixed executable; arguments contain an app-created temp path and numeric loopback port, with no shell.
	cmd.Dir = tmpDir

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn: stdout pipe: %w", err)
	}

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn: stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn: start process: %w", err)
	}

	e.cmd = cmd
	e.cancelDone = make(chan struct{})
	done := e.cancelDone

	go e.drainLog(stdoutPipe)
	go e.drainLog(stderrPipe)

	// Connect to management interface (retry for a few seconds while process starts).
	var mgmtConn net.Conn
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		mgmtConn, err = net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", mgmtPort), time.Second)
		if err == nil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if err != nil {
		e.killProcess()
		return fmt.Errorf("openvpn: connect to management interface: %w", err)
	}
	e.mgmtConn = mgmtConn

	// Subscribe before releasing hold, otherwise CONNECTED is never reported.
	if err := startManagement(mgmtConn); err != nil {
		e.killProcess()
		return fmt.Errorf("openvpn: initialize management: %w", err)
	}

	statusCh <- Status{State: StateConnecting, Message: "OpenVPN process started"}
	go e.monitorManagement(mgmtConn, statusCh, done)
	go e.waitProcess(cmd, statusCh, done)

	return nil
}

func startManagement(conn io.Writer) error {
	_, err := io.WriteString(conn, "state on\nhold release\n")
	return err
}

func (e *OpenVPNEngine) Disconnect() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.killProcess()
}

func (e *OpenVPNEngine) killProcess() error {
	if e.mgmtConn != nil {
		fmt.Fprintf(e.mgmtConn, "signal SIGTERM\n")
		e.mgmtConn.Close()
		e.mgmtConn = nil
	}
	if e.cmd != nil && e.cmd.Process != nil {
		if err := e.cmd.Process.Kill(); err != nil {
			log.Printf("openvpn: kill process: %v", err)
		}
	}
	if e.cancelDone != nil {
		select {
		case <-e.cancelDone:
		default:
			close(e.cancelDone)
		}
		e.cancelDone = nil
	}
	if e.tmpDir != "" {
		os.RemoveAll(e.tmpDir)
		e.tmpDir = ""
	}
	e.cmd = nil
	return nil
}

func (e *OpenVPNEngine) monitorManagement(conn net.Conn, statusCh chan<- Status, done <-chan struct{}) {
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		select {
		case <-done:
			return
		default:
		}
		line := scanner.Text()
		log.Printf("openvpn mgmt: %s", line)
		if status, ok := parseManagementLine(line); ok {
			statusCh <- status
		}
	}
}

func (e *OpenVPNEngine) waitProcess(cmd *exec.Cmd, statusCh chan<- Status, done <-chan struct{}) {
	err := cmd.Wait()

	e.mu.Lock()
	if e.cmd == cmd {
		e.cmd = nil
	}
	e.mu.Unlock()

	select {
	case <-done:
		statusCh <- Status{State: StateDisconnected, Message: "OpenVPN disconnected"}
	default:
		if err != nil {
			statusCh <- Status{State: StateError, Message: fmt.Sprintf("OpenVPN exited: %v", err)}
		} else {
			statusCh <- Status{State: StateDisconnected, Message: "OpenVPN exited"}
		}
	}
}

func (e *OpenVPNEngine) drainLog(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		log.Printf("openvpn: %s", scanner.Text())
	}
}

// parseManagementLine converts an OpenVPN management protocol line to a Status.
func parseManagementLine(line string) (Status, bool) {
	if !strings.HasPrefix(line, ">STATE:") {
		return Status{}, false
	}
	// Format: >STATE:timestamp,state,description,local,remote,...
	parts := strings.SplitN(strings.TrimPrefix(line, ">STATE:"), ",", 4)
	if len(parts) < 2 {
		return Status{}, false
	}
	desc := ""
	if len(parts) >= 3 {
		desc = parts[2]
	}
	switch parts[1] {
	case "CONNECTING":
		return Status{State: StateConnecting, Message: desc}, true
	case "WAIT", "AUTH", "GET_CONFIG", "ASSIGN_IP", "ADD_ROUTES":
		return Status{State: StateConnecting, Message: parts[1] + ": " + desc}, true
	case "CONNECTED":
		return Status{State: StateConnected, Message: desc}, true
	case "EXITING":
		return Status{State: StateDisconnecting, Message: desc}, true
	case "RECONNECTING":
		return Status{State: StateConnecting, Message: "reconnecting: " + desc}, true
	}
	return Status{}, false
}

// freePort finds an available TCP port on localhost.
func freePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return port, nil
}

func isExecutableFile(path string) bool {
	info, err := os.Stat(path) // #nosec G703 -- read-only probe of OS/application install locations; no file is modified.
	return err == nil && info.Mode().IsRegular() && (runtime.GOOS == "windows" || info.Mode().Perm()&0111 != 0)
}
