package vpn

import (
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// SoftEtherEngine wraps the SoftEther VPN client (vpnclient/vpncmd) if installed.
type SoftEtherEngine struct {
	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
	routeMu sync.Mutex
	routes  string
}

func NewSoftEtherEngine() *SoftEtherEngine {
	return &SoftEtherEngine{}
}

func (e *SoftEtherEngine) Name() string { return string(EngineSoftEther) }

// Available checks whether vpnclient and vpncmd are present on this system.
func (e *SoftEtherEngine) Available() bool {
	return e.FindClientBinary() != "" && e.FindCmdBinary() != ""
}

// FindClientBinary searches for the vpnclient executable in known directories and PATH.
func (e *SoftEtherEngine) FindClientBinary() string {
	if runtime.GOOS == "windows" {
		candidates := []string{
			"vpnclient_x64.exe",
			"vpnclient.exe",
		}
		dirs := []string{
			"SoftEther VPN Client",
			"SoftEther VPN Client_x64",
			"SoftEther VPN",
			"SoftEther",
		}
		for _, name := range candidates {
			for _, dir := range dirs {
				for _, pf := range []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), `C:\Program Files`, `C:\Program Files (x86)`} {
					if pf != "" {
						p := filepath.Join(pf, dir, name)
						if isExecutableFile(p) {
							return p
						}
					}
				}
			}
			if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
				p := filepath.Join(localAppData, "Veilora", "bin", name)
				if isExecutableFile(p) {
					return p
				}
			}
			if exe, err := os.Executable(); err == nil {
				p := filepath.Join(filepath.Dir(exe), "bin", name)
				if isExecutableFile(p) {
					return p
				}
			}
			if path, err := exec.LookPath(name); err == nil && isExecutableFile(path) {
				return path
			}
		}
		return ""
	}

	for _, name := range []string{"vpnclient", "/usr/local/bin/vpnclient", "/usr/bin/vpnclient"} {
		if path, err := exec.LookPath(name); err == nil && isExecutableFile(path) {
			return path
		}
	}
	return ""
}

// FindCmdBinary searches for the vpncmd executable in known directories and PATH.
func (e *SoftEtherEngine) FindCmdBinary() string {
	if runtime.GOOS == "windows" {
		candidates := []string{
			"vpncmd_x64.exe",
			"vpncmd.exe",
		}
		dirs := []string{
			"SoftEther VPN Client",
			"SoftEther VPN Client_x64",
			"SoftEther VPN",
			"SoftEther",
		}
		for _, name := range candidates {
			for _, dir := range dirs {
				for _, pf := range []string{os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), `C:\Program Files`, `C:\Program Files (x86)`} {
					if pf != "" {
						p := filepath.Join(pf, dir, name)
						if isExecutableFile(p) {
							return p
						}
					}
				}
			}
			if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
				p := filepath.Join(localAppData, "Veilora", "bin", name)
				if isExecutableFile(p) {
					return p
				}
			}
			if exe, err := os.Executable(); err == nil {
				p := filepath.Join(filepath.Dir(exe), "bin", name)
				if isExecutableFile(p) {
					return p
				}
			}
			if path, err := exec.LookPath(name); err == nil && isExecutableFile(path) {
				return path
			}
		}
		return ""
	}

	for _, name := range []string{"vpncmd", "/usr/local/bin/vpncmd", "/usr/bin/vpncmd"} {
		if path, err := exec.LookPath(name); err == nil && isExecutableFile(path) {
			return path
		}
	}
	return ""
}

func (e *SoftEtherEngine) cmdBinary() string {
	if p := e.FindCmdBinary(); p != "" {
		return p
	}
	if runtime.GOOS == "windows" {
		return "vpncmd.exe"
	}
	return "vpncmd"
}

// Connect uses vpncmd to configure and connect to the VPN server described in ovpnConfig.
// The OpenVPN config is parsed to extract the remote host/port; then SoftEther's
// native SSL-VPN protocol is used to connect (which VPNGate servers all support).
func (e *SoftEtherEngine) Connect(ovpnConfig []byte, statusCh chan<- Status) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.running {
		return fmt.Errorf("softether: already connected")
	}

	configData, err := base64.StdEncoding.DecodeString(string(ovpnConfig))
	if err != nil {
		configData = ovpnConfig
	}

	host, port, err := extractRemote(string(configData))
	if err != nil {
		return fmt.Errorf("softether: parse remote from config: %w", err)
	}

	e.stopCh = make(chan struct{})
	e.running = true

	go func() {
		statusCh <- Status{State: StateConnecting, Message: "SoftEther connecting to " + host}

		e.runVpnClient()

		if err := e.runConnect(host, port); err != nil {
			statusCh <- Status{State: StateError, Message: fmt.Sprintf("vpncmd connect: %v", err)}
			e.mu.Lock()
			e.running = false
			e.mu.Unlock()
			return
		}

		statusCh <- Status{State: StateConnected, Message: "SoftEther connected to " + host}

		// Wait until disconnect is requested.
		<-e.stopCh
		e.disconnect(statusCh)
	}()

	return nil
}

func (e *SoftEtherEngine) Disconnect() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.running {
		return nil
	}
	if e.stopCh != nil {
		close(e.stopCh)
		e.stopCh = nil
	}
	e.running = false
	return nil
}

func (e *SoftEtherEngine) disconnect(statusCh chan<- Status) {
	statusCh <- Status{State: StateDisconnecting, Message: "SoftEther disconnecting"}

	e.routeMu.Lock()
	snapshot := e.routes
	e.routes = ""
	e.routeMu.Unlock()

	args := []string{"/CLIENT", "localhost", "/CMD", "AccountDisconnect", "VeiloraVPN", "AccountDelete", "VeiloraVPN"}
	cmd := hiddenCommand(e.cmdBinary(), args...) // #nosec G204 -- executable and disconnect arguments are fixed by this package.
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("softether: disconnect: %v: %s", err, out)
	}
	if snapshot != "" {
		if restoreErr := restoreSoftEtherRouting(snapshot); restoreErr != nil {
			log.Printf("softether: restore routing: %v", restoreErr)
		}
	}

	statusCh <- Status{State: StateDisconnected, Message: "SoftEther disconnected"}
}

func (e *SoftEtherEngine) runVpnClient() {
	cmd := hiddenCommand("sc.exe", "query", "SEVPNCLIENT")
	out, err := cmd.CombinedOutput()
	if err == nil && strings.Contains(strings.ToUpper(string(out)), "RUNNING") {
		e.waitForVpnCmd()
		return
	}

	start := hiddenCommand("sc.exe", "start", "SEVPNCLIENT")
	out, err = start.CombinedOutput()
	if err != nil {
		log.Printf("softether: start service: %v: %s", err, out)
	}
	e.waitForVpnCmd()
}

func (e *SoftEtherEngine) waitForVpnCmd() {
	for i := 0; i < 10; i++ {
		check := hiddenCommand(e.cmdBinary(), "/CLIENT", "localhost", "/CMD", "About")
		if out, err := check.CombinedOutput(); err == nil && len(out) > 0 {
			return
		}
		time.Sleep(250 * time.Millisecond)
	}
}

func (e *SoftEtherEngine) runConnect(host, port string) error {
	cleanup := [][]string{
		{"AccountDisconnect", "VeiloraVPN"},
		{"AccountDelete", "VeiloraVPN"},
	}
	for _, command := range cleanup {
		args := append([]string{"/CLIENT", "localhost", "/CMD"}, command...)
		_ = hiddenCommand(e.cmdBinary(), args...).Run()
	}

	nicOut, nicErr := hiddenCommand(e.cmdBinary(), "/CLIENT", "localhost", "/CMD", "NicList").CombinedOutput()
	logVPNCmdOutput(nicOut)
	if nicErr != nil || vpnCmdOutputHasError(nicOut) {
		return errors.New("SoftEther virtual network adapter is unavailable")
	}
	if !strings.Contains(strings.ToLower(string(nicOut)), "vpn") {
		return errors.New("SoftEther virtual network adapter VPN was not found")
	}

	commands := [][]string{
		softEtherAccountCreateCommand(host, port),
		{"AccountPasswordSet", "VeiloraVPN", "/PASSWORD:vpn", "/TYPE:standard"},
		{"AccountConnect", "VeiloraVPN"},
	}
	for _, command := range commands {
		args := append([]string{"/CLIENT", "localhost", "/CMD"}, command...)
		out, err := hiddenCommand(e.cmdBinary(), args...).CombinedOutput()
		logVPNCmdOutput(out)
		if err != nil {
			return fmt.Errorf("SoftEther vpncmd %s failed: %w", command[0], err)
		}
		if vpnCmdOutputHasError(out) {
			return fmt.Errorf("SoftEther vpncmd %s failed", command[0])
		}
	}

	for i := 0; i < 30; i++ {
		args := []string{"/CLIENT", "localhost", "/CMD", "AccountStatusGet", "VeiloraVPN"}
		out, err := hiddenCommand(e.cmdBinary(), args...).CombinedOutput()
		logVPNCmdOutput(out)
		if err == nil && softEtherSessionEstablished(out) {
			snapshot, routeErr := enableSoftEtherRouting()
			if routeErr != nil {
				log.Printf("softether: route priority not applied: %v", routeErr)
			} else {
				e.routeMu.Lock()
				e.routes = snapshot
				e.routeMu.Unlock()
			}
			return nil
		}
		if vpnCmdOutputHasError(out) {
			return errors.New("SoftEther account exists but the VPN session could not be established")
		}
		time.Sleep(250 * time.Millisecond)
	}

	return errors.New("SoftEther VPN session did not become established")
}

func softEtherAccountCreateCommand(host, port string) []string {
	return []string{
		"AccountCreate",
		"VeiloraVPN",
		"/SERVER:" + host + ":" + port,
		"/HUB:VPNGATE",
		"/USERNAME:vpn",
		"/NICNAME:VPN",
	}
}

func logVPNCmdOutput(out []byte) {
	for _, line := range strings.Split(string(out), "\n") {
		if strings.TrimSpace(line) != "" {
			log.Printf("softether: vpncmd: %s", strings.TrimSpace(line))
		}
	}
}

func vpnCmdOutputHasError(out []byte) bool {
	lower := strings.ToLower(string(out))
	return strings.Contains(lower, "error occurred") ||
		strings.Contains(lower, "error code") ||
		strings.Contains(lower, "does not exist") ||
		strings.Contains(lower, "failed")
}

func softEtherSessionEstablished(out []byte) bool {
	lower := strings.ToLower(string(out))
	return strings.Contains(lower, "session established") ||
		strings.Contains(lower, "connection completed")
}

// extractRemote parses `remote <host> <port>` from an OpenVPN config.
func extractRemote(config string) (host, port string, err error) {
	for _, line := range strings.Split(config, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "remote ") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				return parts[1], parts[2], nil
			}
			if len(parts) == 2 {
				return parts[1], "443", nil
			}
		}
	}
	return "", "", fmt.Errorf("no remote directive found")
}
