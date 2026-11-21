package vpn

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// EngineInstallProgress reports download and configuration progress.
type EngineInstallProgress struct {
	Stage   string `json:"stage"`   // "starting", "downloading", "installing", "ready", "error"
	Percent int    `json:"percent"` // 0-100
	Message string `json:"message"` // Human-readable status
}

// InstallEngine installs the OpenVPN tunneling engine for the host platform.
func InstallEngine(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	if progressCb == nil {
		progressCb = func(EngineInstallProgress) {}
	}

	progressCb(EngineInstallProgress{
		Stage:   "starting",
		Percent: 5,
		Message: "Initializing engine setup...",
	})

	switch runtime.GOOS {
	case "windows":
		return installWindowsEngine(ctx, progressCb)
	case "darwin":
		return installDarwinEngine(ctx, progressCb)
	case "linux":
		return installLinuxEngine(ctx, progressCb)
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
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

	// Fallback: Direct download of OpenVPN community installer
	progressCb(EngineInstallProgress{
		Stage:   "downloading",
		Percent: 25,
		Message: "Downloading OpenVPN installer package...",
	})

	installerURL := "https://swupdate.openvpn.org/community/releases/OpenVPN-2.7.9-I002-amd64.msi"
	tmpFile := filepath.Join(os.TempDir(), "openvpn-setup.msi")
	defer os.Remove(tmpFile)

	req, err := http.NewRequestWithContext(ctx, "GET", installerURL, nil)
	if err != nil {
		return fmt.Errorf("create download request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
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
	out.Close()

	progressCb(EngineInstallProgress{
		Stage:   "installing",
		Percent: 80,
		Message: "Configuring VPN network adapter...",
	})

	// Run MSI silent install
	msiCmd := hiddenCommandContext(ctx, "msiexec.exe", "/i", tmpFile, "/qn", "/norestart")
	if msiOut, err := msiCmd.CombinedOutput(); err != nil {
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
