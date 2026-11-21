package vpn

import (
	"bufio"
	"encoding/base64"
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
}

func NewSoftEtherEngine() *SoftEtherEngine {
	return &SoftEtherEngine{}
}

func (e *SoftEtherEngine) Name() string { return string(EngineSoftEther) }

// Available checks whether vpnclient and vpncmd are present on this system.
func (e *SoftEtherEngine) Available() bool {
	_, errClient := exec.LookPath(e.clientBinary())
	_, errCmd := exec.LookPath(e.cmdBinary())
	return errClient == nil && errCmd == nil
}

func (e *SoftEtherEngine) clientBinary() string {
	if runtime.GOOS == "windows" {
		return "vpnclient.exe"
	}
	return "vpnclient"
}

func (e *SoftEtherEngine) cmdBinary() string {
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

	tmpDir, err := os.MkdirTemp("", "zen-se-*")
	if err != nil {
		return fmt.Errorf("softether: create temp dir: %w", err)
	}

	scriptPath := filepath.Join(tmpDir, "connect.txt")
	script := fmt.Sprintf(
		"VpnClient\nAccountCreate ZenVPN /SERVER:%s:%s /HUB:VPNGATE /USERNAME:vpn /NICNAME:VPN\n"+
			"AccountPasswordSet ZenVPN /PASSWORD:vpn /TYPE:standard\nAccountConnect ZenVPN\nexit\n",
		host, port,
	)
	if err := os.WriteFile(scriptPath, []byte(script), 0600); err != nil {
		os.RemoveAll(tmpDir)
		return fmt.Errorf("softether: write script: %w", err)
	}

	e.stopCh = make(chan struct{})
	e.running = true

	go func() {
		defer os.RemoveAll(tmpDir)
		statusCh <- Status{State: StateConnecting, Message: "SoftEther connecting to " + host}

		e.runVpnClient()

		if err := e.runConnect(scriptPath); err != nil {
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

	args := []string{"/CLIENT", "localhost", "/CMD", "AccountDisconnect", "ZenVPN", "AccountDelete", "ZenVPN"}
	cmd := exec.Command(e.cmdBinary(), args...) // #nosec G204 -- executable and disconnect arguments are fixed by this package.
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("softether: disconnect: %v: %s", err, out)
	}

	statusCh <- Status{State: StateDisconnected, Message: "SoftEther disconnected"}
}

func (e *SoftEtherEngine) runVpnClient() {
	cmd := exec.Command(e.clientBinary(), "start") // #nosec G204 -- executable name is selected from fixed OS-specific constants.
	out, err := cmd.CombinedOutput()
	if err != nil {
		// May already be running — not an error.
		log.Printf("softether: vpnclient start: %v: %s", err, out)
	}
	time.Sleep(2 * time.Second)
}

func (e *SoftEtherEngine) runConnect(scriptPath string) error {
	cmd := exec.Command(e.cmdBinary(), "/CLIENT", "localhost", "/IN", scriptPath) // #nosec G204 -- fixed executable; scriptPath is created in the private temp directory above, not a shell command.
	pipe, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start vpncmd: %w", err)
	}
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		log.Printf("softether: %s", scanner.Text())
	}
	return cmd.Wait()
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
