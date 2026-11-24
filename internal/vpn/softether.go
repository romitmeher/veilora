package vpn

import (
	"context"
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

const (
	softEtherServiceName  = "SEVPNCLIENTDEV"
	softEtherServiceTitle = "Veilora VPN"
	softEtherAccountName  = "VeiloraVPN"
	softEtherAdapterName  = "VPN"
	softEtherNativePort   = "443"
)

func NewSoftEtherEngine() *SoftEtherEngine {
	return &SoftEtherEngine{}
}

func (e *SoftEtherEngine) Name() string { return string(EngineSoftEther) }

// Available checks whether vpnclient and vpncmd are present on this system.
func (e *SoftEtherEngine) Available() bool {
	if len(embeddedSoftEther()) > 0 {
		_, err := bundledSoftEtherRuntimeDir()
		return err == nil
	}
	if len(embeddedVPN()) > 0 {
		return false
	}
	if runtime.GOOS == "windows" {
		if e.FindClientBinary() == "" || e.FindCmdBinary() == "" {
			return false
		}
		for _, serviceName := range []string{"SEVPNCLIENT", "SEVPNCLIENTDEV"} {
			query := hiddenCommand("sc.exe", "query", serviceName)
			out, err := query.CombinedOutput()
			if err == nil && strings.Contains(strings.ToUpper(string(out)), "RUNNING") {
				nic := hiddenCommand(e.FindCmdBinary(), "/CLIENT", "localhost", "/CMD", "NicList")
				nicOut, nicErr := nic.CombinedOutput()
				return nicErr == nil && strings.Contains(strings.ToLower(string(nicOut)), "vpn")
			}
		}
		return false
	}
	return e.FindClientBinary() != "" && e.FindCmdBinary() != ""
}

// FindClientBinary searches for the vpnclient executable in known directories and PATH.
func (e *SoftEtherEngine) FindClientBinary() string {
	if len(embeddedSoftEther()) > 0 {
		bundled, err := bundledSoftEtherBinary()
		if err == nil {
			return bundled
		}
		log.Printf("bundled SoftEther: %v", err)
	}

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
	if len(embeddedSoftEther()) > 0 {
		dir, err := bundledSoftEtherRuntimeDir()
		if err == nil {
			cmd := filepath.Join(dir, "vpncmd.exe")
			if isExecutableFile(cmd) {
				return cmd
			}
		} else {
			log.Printf("bundled SoftEther: %v", err)
		}
	}

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

	host, port, err := SoftEtherNativeEndpoint(string(configData))
	if err != nil {
		return fmt.Errorf("softether: parse remote from config: %w", err)
	}

	e.stopCh = make(chan struct{})
	e.running = true

	go func() {
		statusCh <- Status{State: StateConnecting, Message: "SoftEther connecting to " + host}

		if err := e.runVpnClient(); err != nil {
			statusCh <- Status{State: StateError, Message: err.Error()}
			e.mu.Lock()
			e.running = false
			e.mu.Unlock()
			return
		}

		if err := e.runConnect(host, port); err != nil {
			cleanupStatus := Status{State: StateError, Message: fmt.Sprintf("vpncmd connect: %v", err)}
			if cleanupErr := e.cleanup(); cleanupErr != nil {
				cleanupStatus.Message += "; cleanup failed: " + cleanupErr.Error()
			}
			e.mu.Lock()
			e.running = false
			e.mu.Unlock()
			statusCh <- cleanupStatus
			return
		}

		statusCh <- Status{State: StateConnected, Message: "SoftEther connected to " + host}

		// Wait until disconnect is requested.
		stopCh := e.stopCh
		go e.monitorConnection(statusCh, stopCh)
		<-stopCh
		statusCh <- Status{State: StateDisconnecting, Message: "SoftEther disconnecting"}
		if cleanupErr := e.cleanup(); cleanupErr != nil {
			statusCh <- Status{State: StateError, Message: "SoftEther cleanup incomplete: " + cleanupErr.Error()}
		} else {
			statusCh <- Status{State: StateDisconnected, Message: "SoftEther disconnected"}
		}
		e.mu.Lock()
		e.running = false
		e.mu.Unlock()
	}()

	return nil
}

func (e *SoftEtherEngine) monitorConnection(statusCh chan<- Status, stopCh <-chan struct{}) {
	failureCount := 0
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-stopCh:
			return
		case <-ticker.C:
			out, err := hiddenCommand(e.cmdBinary(), "/CLIENT", "localhost", "/CMD",
				"AccountStatusGet", softEtherAccountName).CombinedOutput()
			switch {
			case err != nil || vpnCmdOutputHasError(out):
				failureCount++
			case softEtherSessionEstablished(out):
				failureCount = 0
				continue
			default:
				failureCount++
			}
			if failureCount == 1 {
				statusCh <- Status{State: StateReconnecting, Message: "SoftEther session interrupted"}
			}
			if failureCount >= 5 {
				statusCh <- Status{State: StateError, Message: "SoftEther session lost"}
				return
			}
		}
	}
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
	return nil
}

func (e *SoftEtherEngine) cleanup() error {
	e.routeMu.Lock()
	snapshot := e.routes
	e.routes = ""
	e.routeMu.Unlock()

	var cleanupErr error
	disconnectArgs := []string{"/CLIENT", "localhost", "/CMD", "AccountDisconnect", softEtherAccountName}
	out, err := hiddenCommand(e.cmdBinary(), disconnectArgs...).CombinedOutput()
	if err != nil {
		cleanupErr = fmt.Errorf("disconnect account: %w: %s", err, out)
	}
	deleteArgs := []string{"/CLIENT", "localhost", "/CMD", "AccountDelete", softEtherAccountName}
	out, err = hiddenCommand(e.cmdBinary(), deleteArgs...).CombinedOutput()
	if err != nil {
		deleteErr := fmt.Errorf("delete account: %w: %s", err, out)
		cleanupErr = errors.Join(cleanupErr, deleteErr)
	}
	if snapshot != "" {
		if restoreErr := restoreSoftEtherRouting(snapshot); restoreErr != nil {
			log.Printf("softether: restore routing: %v", restoreErr)
			cleanupErr = errors.Join(cleanupErr, fmt.Errorf("restore routing: %w", restoreErr))
		}
	}
	return cleanupErr
}

func (e *SoftEtherEngine) runVpnClient() error {
	serviceName := "SEVPNCLIENT"
	cmd := hiddenCommand("sc.exe", "query", serviceName)
	out, err := cmd.CombinedOutput()
	if err != nil {
		serviceName = softEtherServiceName
		cmd = hiddenCommand("sc.exe", "query", serviceName)
		out, err = cmd.CombinedOutput()
	}
	if err == nil && strings.Contains(strings.ToUpper(string(out)), "RUNNING") {
		return e.waitForVpnCmd()
	}

	start := hiddenCommand("sc.exe", "start", serviceName)
	out, err = start.CombinedOutput()
	if err != nil {
		if (strings.Contains(string(out), "1060") || strings.Contains(strings.ToLower(string(out)), "does not exist")) && len(embeddedSoftEther()) > 0 {
			log.Printf("softether: service not provisioned, auto-provisioning bundled SoftEther...")
			ownership, provErr := ProvisionBundledSoftEther(context.Background())
			if provErr != nil {
				return fmt.Errorf("auto-provision SoftEther VPN: %w", provErr)
			}
			log.Printf("softether: auto-provisioned service %s", ownership.Service)
			return e.waitForVpnCmd()
		}
		if strings.Contains(string(out), "1060") || strings.Contains(strings.ToLower(string(out)), "does not exist") {
			return fmt.Errorf("SoftEther VPN service is not provisioned; use Provision Veilora VPN")
		}
		return fmt.Errorf("softether: start service: %w: %s", err, out)
	}
	return e.waitForVpnCmd()
}

func (e *SoftEtherEngine) waitForVpnCmd() error {
	for i := 0; i < 10; i++ {
		check := hiddenCommand(e.cmdBinary(), "/CLIENT", "localhost", "/CMD", "About")
		if out, err := check.CombinedOutput(); err == nil && len(out) > 0 {
			return nil
		}
		time.Sleep(250 * time.Millisecond)
	}
	return fmt.Errorf("softether: VPN client service did not become ready")
}

func (e *SoftEtherEngine) runConnect(host, port string) error {
	cleanup := [][]string{
		{"AccountDisconnect", softEtherAccountName},
		{"AccountDelete", softEtherAccountName},
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
		{"AccountPasswordSet", softEtherAccountName, "/PASSWORD:vpn", "/TYPE:standard"},
		{"AccountConnect", softEtherAccountName},
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
		args := []string{"/CLIENT", "localhost", "/CMD", "AccountStatusGet", softEtherAccountName}
		out, err := hiddenCommand(e.cmdBinary(), args...).CombinedOutput()
		logVPNCmdOutput(out)
		if err == nil && softEtherSessionEstablished(out) {
			snapshot, routeErr := enableSoftEtherRouting()
			if routeErr != nil {
				return fmt.Errorf("SoftEther route setup failed: %w", routeErr)
			}
			e.routeMu.Lock()
			e.routes = snapshot
			e.routeMu.Unlock()
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
		softEtherAccountName,
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
