package vpn

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"sync"
	"time"
)

// EngineInstallProgress reports download and configuration progress.
type EngineInstallProgress struct {
	Stage   string `json:"stage"`   // "starting", "downloading", "installing", "ready", "error"
	Percent int    `json:"percent"` // 0-100
	Message string `json:"message"` // Human-readable status
}

var engineInstallMu sync.Mutex

// InstallEngine installs the default OpenVPN tunneling engine for the host platform (backward compatible).
func InstallEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	return InstallEngineType(ctx, EngineOpenVPN, progressCb)
}

// InstallEngineType installs the specified tunneling engine (EngineOpenVPN or EngineSoftEther).
func InstallEngineType(ctx context.Context, engine EngineType, progressCb func(EngineInstallProgress)) error {
	if !engineInstallMu.TryLock() {
		return errors.New("engine installation is already running")
	}
	defer engineInstallMu.Unlock()
	ctx, cancel := context.WithTimeout(ctx, 15*time.Minute)
	defer cancel()
	if progressCb == nil {
		progressCb = func(EngineInstallProgress) {}
	}

	progressCb(EngineInstallProgress{
		Stage:   "starting",
		Percent: 5,
		Message: fmt.Sprintf("Initializing %s engine setup...", engine),
	})

	var err error
	report := func(p EngineInstallProgress) {
		if p.Stage != "ready" {
			progressCb(p)
		}
	}

	switch engine {
	case EngineOpenVPN:
		if len(embeddedVPN()) > 0 {
			_, err = bundledBinary()
			break
		}
		switch runtime.GOOS {
		case "windows":
			err = errors.New("OpenVPN MSI installation is blocked by Windows policy (MSI 1625); use the bundled Veilora OpenVPN runtime")
		case "darwin":
			err = installDarwinEngine(ctx, report)
		case "linux":
			err = installLinuxEngine(ctx, report)
		default:
			err = fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
		}
		if err == nil && NewOpenVPNEngine().FindBinary() == "" {
			err = errors.New("installer finished, but OpenVPN is unavailable; restart Veilora or repair the installation")
		}
	case EngineSoftEther:
		if runtime.GOOS != "windows" {
			err = fmt.Errorf("SoftEther VPN Gate client plugin installer is only supported on Windows")
		} else {
			err = errors.New("external SoftEther installer execution is disabled; use the bundled SoftEther payload")
		}
		if err == nil && !NewSoftEtherEngine().Available() {
			err = errors.New("installer finished, but SoftEther VPN Client is not yet active or was cancelled")
		}
	default:
		err = fmt.Errorf("unsupported engine type: %s", engine)
	}

	if err != nil {
		progressCb(EngineInstallProgress{Stage: "error", Message: err.Error()})
		return err
	}
	progressCb(EngineInstallProgress{
		Stage:   "ready",
		Percent: 100,
		Message: fmt.Sprintf("%s installed. Tunnel connectivity has not been tested.", engine),
	})
	return nil
}

func installDarwinEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	if _, err := exec.LookPath("brew"); err == nil {
		progressCb(EngineInstallProgress{
			Stage:   "installing",
			Percent: 50,
			Message: "Installing OpenVPN via Homebrew...",
		})
		cmd := exec.CommandContext(ctx, "brew", "install", "openvpn")
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("brew install openvpn: %v (%s)", err, string(out))
		}
		progressCb(EngineInstallProgress{
			Stage:   "ready",
			Percent: 100,
			Message: "OpenVPN installed successfully!",
		})
		return nil
	}
	return fmt.Errorf("please install Homebrew or run 'brew install openvpn'")
}

func installLinuxEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	// Check standard package managers
	if _, err := exec.LookPath("apt-get"); err == nil {
		progressCb(EngineInstallProgress{
			Stage:   "installing",
			Percent: 50,
			Message: "Installing OpenVPN via apt...",
		})
		cmd := exec.CommandContext(ctx, "pkexec", "apt-get", "install", "-y", "openvpn")
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("apt install openvpn: %v (%s)", err, string(out))
		}
		progressCb(EngineInstallProgress{
			Stage:   "ready",
			Percent: 100,
			Message: "OpenVPN installed successfully!",
		})
		return nil
	}
	return fmt.Errorf("please run 'sudo apt install openvpn' or 'sudo dnf install openvpn'")
}

func windowsInstallerURL(arch string) (string, error) {
	if arch != "amd64" && arch != "arm64" {
		return "", fmt.Errorf("unsupported Windows architecture: %s", arch)
	}
	return "https://swupdate.openvpn.org/community/releases/OpenVPN-2.7.9-I002-" + arch + ".msi", nil
}
