package vpn

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
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

// InstallEngine installs the OpenVPN tunneling engine for the host platform.
func InstallEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
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
		Message: "Initializing engine setup...",
	})

	var err error
	// Platform installers report progress; readiness is checked centrally.
	report := func(p EngineInstallProgress) {
		if p.Stage != "ready" {
			progressCb(p)
		}
	}
	switch runtime.GOOS {
	case "windows":
		err = installWindowsEngine(ctx, report)
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
	if err != nil {
		progressCb(EngineInstallProgress{Stage: "error", Message: err.Error()})
		return err
	}
	progressCb(EngineInstallProgress{Stage: "ready", Percent: 100, Message: "OpenVPN installed. Tunnel connectivity has not been tested."})
	return nil
}

func installWindowsEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	// First, check if winget is available on Windows 10/11
	if _, err := exec.LookPath("winget"); err == nil {
		progressCb(EngineInstallProgress{
			Stage:   "downloading",
			Percent: 30,
			Message: "Downloading OpenVPN through Windows Package Manager...",
		})

		cmd := hiddenCommandContext(ctx, "winget", "install",
			"--id", "OpenVPNTechnologies.OpenVPN",
			"-e",
			"--silent",
			"--accept-source-agreements",
			"--accept-package-agreements",
		)
		out, err := cmd.CombinedOutput()
		if err == nil {
			progressCb(EngineInstallProgress{
				Stage:   "ready",
				Percent: 100,
				Message: "VPN engine installed successfully!",
			})
			return nil
		}
		log.Printf("vpn installer: winget failed (%v): %s; falling back to direct download", err, string(out))
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}
	// Fallback: Direct download of OpenVPN community installer
	progressCb(EngineInstallProgress{
		Stage:   "downloading",
		Percent: 25,
		Message: "Downloading OpenVPN installer package...",
	})

	installerURL, err := windowsInstallerURL(runtime.GOARCH)
	if err != nil {
		return err
	}
	tmpDir, err := os.MkdirTemp("", "veilora-openvpn-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)
	tmpFile := filepath.Join(tmpDir, "openvpn-setup.msi")

	req, err := http.NewRequestWithContext(ctx, "GET", installerURL, nil)
	if err != nil {
		return fmt.Errorf("create download request: %w", err)
	}

	resp, err := (&http.Client{Timeout: 5 * time.Minute}).Do(req)
	if err != nil {
		return fmt.Errorf("download openvpn installer: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download openvpn failed with status %d", resp.StatusCode)
	}

	out, err := os.Create(tmpFile)
	if err != nil {
		return fmt.Errorf("create temp installer file: %w", err)
	}

	totalSize := resp.ContentLength
	const maxInstallerSize = 100 * 1024 * 1024
	if totalSize > maxInstallerSize {
		out.Close()
		return errors.New("installer exceeds size limit")
	}
	var downloaded int64
	buf := make([]byte, 32*1024)

	for {
		select {
		case <-ctx.Done():
			out.Close()
			return ctx.Err()
		default:
		}

		n, rErr := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := out.Write(buf[:n]); wErr != nil {
				out.Close()
				return fmt.Errorf("write installer file: %w", wErr)
			}
			downloaded += int64(n)
			if downloaded > maxInstallerSize {
				out.Close()
				return errors.New("installer exceeds size limit")
			}
			if totalSize > 0 {
				pct := 25 + int(float64(downloaded)/float64(totalSize)*50.0)
				progressCb(EngineInstallProgress{
					Stage:   "downloading",
					Percent: pct,
					Message: fmt.Sprintf("Downloading... (%d%%)", pct),
				})
			}
		}
		if rErr != nil {
			if rErr == io.EOF {
				break
			}
			out.Close()
			return fmt.Errorf("download stream error: %w", rErr)
		}
	}
	if err := out.Close(); err != nil {
		return err
	}
	if downloaded == 0 || (totalSize >= 0 && downloaded != totalSize) {
		return errors.New("incomplete installer download")
	}
	if err := verifyWindowsInstaller(ctx, tmpFile); err != nil {
		return err
	}

	progressCb(EngineInstallProgress{
		Stage:   "installing",
		Percent: 80,
		Message: "Configuring VPN network adapter...",
	})

	// Run MSI silent install
	msiCmd := hiddenCommandContext(ctx, "msiexec.exe", "/i", tmpFile, "/qn", "/norestart")
	if msiOut, err := msiCmd.CombinedOutput(); err != nil && !installerRebootRequired(err) {
		return fmt.Errorf("run openvpn msi installer (%v): %s", err, string(msiOut))
	}

	progressCb(EngineInstallProgress{
		Stage:   "ready",
		Percent: 100,
		Message: "VPN engine installed successfully!",
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

func installerRebootRequired(err error) bool {
	var exitErr *exec.ExitError
	return errors.As(err, &exitErr) && exitErr.ExitCode() == 3010
}
