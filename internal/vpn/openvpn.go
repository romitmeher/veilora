package vpn

import (
	"bufio"
	"encoding/base64"
	"errors"
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
	mu             sync.Mutex
	cmd            *exec.Cmd
	mgmtConn       net.Conn
	tmpDir         string
	cancelDone     chan struct{}
	processDone    chan struct{}
	cleanupAdapter func() error
}

func NewOpenVPNEngine() *OpenVPNEngine {
	return &OpenVPNEngine{}
}

func (e *OpenVPNEngine) Name() string { return string(EngineOpenVPN) }

// Available checks if openvpn binary is reachable.
func (e *OpenVPNEngine) Available() bool {
	if len(embeddedVPN()) > 0 {
		return true
	}
	return e.FindBinary() != ""
}

// FindBinary searches for the openvpn executable in known directories and PATH.
func (e *OpenVPNEngine) FindBinary() string {
	if len(embeddedVPN()) > 0 {
		binary, err := bundledBinary()
		if err != nil {
			log.Printf("bundled VPN: %v", err)
			return ""
		}
		return binary
	}
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
	if e.cleanupAdapter != nil {
		return errors.New("previous VPN adapter cleanup is pending; disconnect before reconnecting")
	}

	configData, err := base64.StdEncoding.DecodeString(string(ovpnConfigB64))
	if err != nil {
		// Config might already be plain text.
		configData = ovpnConfigB64
	}
	if runtime.GOOS == "windows" {
		host, port, remoteErr := extractRemoteForDial(string(configData))
		if remoteErr == nil {
			proto := "udp"
			for _, line := range strings.Split(string(configData), "\n") {
				fields := strings.Fields(strings.TrimSpace(line))
				if len(fields) >= 2 && fields[0] == "proto" {
					proto = strings.ToLower(fields[1])
					break
				}
			}
			if proto == "tcp" {
				conn, dialErr := net.DialTimeout("tcp", net.JoinHostPort(host, port), 5*time.Second)
				if dialErr != nil {
					return fmt.Errorf("OpenVPN server %s:%s is unreachable: %w", host, port, dialErr)
				}
				conn.Close()
			}
		}
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

	if runtime.GOOS == "windows" {
		args = append(args, "--data-ciphers-fallback", "AES-128-CBC", "--disable-dco")
	} else {
		args = append(args, "--script-security", "1")
	}

	binPath := e.FindBinary()
	if binPath == "" {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("openvpn binary not found")
	}
	if len(embeddedVPN()) > 0 {
		id, cleanup, err := prepareBundledAdapter(filepath.Dir(binPath))
		if err != nil {
			os.RemoveAll(tmpDir)
			return err
		}
		e.cleanupAdapter = cleanup
		args = append(args, "--windows-driver", "tap-windows6", "--dev-node", id)
	}
	connected := false
	defer func() {
		if !connected {
			if err := e.killProcess(); err != nil {
				log.Printf("VPN startup cleanup: %v", err)
			}
		}
	}()

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
	e.processDone = make(chan struct{})
	go e.waitProcess(cmd, statusCh, done, e.processDone)

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
	connected = true

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
		_, _ = fmt.Fprintf(e.mgmtConn, "signal SIGTERM\n")
	}
	if e.cmd != nil && e.cmd.Process != nil {
		select {
		case <-e.processDone:
		case <-time.After(3 * time.Second):
			if err := e.cmd.Process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
				if e.mgmtConn != nil {
					e.mgmtConn.Close()
					e.mgmtConn = nil
				}
				return err
			}
			select {
			case <-e.processDone:
			case <-time.After(3 * time.Second):
				if e.mgmtConn != nil {
					e.mgmtConn.Close()
					e.mgmtConn = nil
				}
				return errors.New("OpenVPN process did not stop; adapter retained for cleanup")
			}
		}
	}
	if e.mgmtConn != nil {
		e.mgmtConn.Close()
		e.mgmtConn = nil
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
	if e.cleanupAdapter != nil {
		if err := e.cleanupAdapter(); err != nil {
			return err
		}
		e.cleanupAdapter = nil
	}
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
		if strings.HasPrefix(line, ">HOLD:") {
			go func() {
				_, _ = io.WriteString(conn, "hold release\n")
			}()
		}
		if status, ok := parseManagementLine(line); ok {
			statusCh <- status
		}
	}
}

func (e *OpenVPNEngine) waitProcess(cmd *exec.Cmd, statusCh chan<- Status, done <-chan struct{}, processDone chan<- struct{}) {
	err := cmd.Wait()
	close(processDone) // Before locking: Disconnect waits for exit while holding mu.

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

func extractRemoteForDial(config string) (host, port string, err error) {
	for _, line := range strings.Split(config, "\n") {
		fields := strings.Fields(strings.TrimSpace(line))
		if len(fields) >= 2 && fields[0] == "remote" {
			host = strings.TrimSpace(fields[1])
			port = "1194"
			if len(fields) >= 3 {
				port = strings.TrimSpace(fields[2])
			}
			if host == "" || port == "" {
				return "", "", errors.New("invalid remote directive")
			}
			return host, port, nil
		}
	}
	return "", "", errors.New("no remote directive")
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
		return Status{State: StateReconnecting, Message: "reconnecting: " + desc}, true
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
