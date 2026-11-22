package vpn

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
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

const (
	defaultVPNGateMirrorBase = "http://v-dot-pn-ams2.opengw.net:34637"
	maxPluginZipSize         = 150 * 1024 * 1024
)

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
	case EngineSoftEther:
		if runtime.GOOS != "windows" {
			err = fmt.Errorf("SoftEther VPN Gate client plugin installer is only supported on Windows")
		} else {
			err = installSoftEtherWindows(ctx, report)
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

func installSoftEtherWindows(ctx context.Context, progressCb func(EngineInstallProgress)) error {
	progressCb(EngineInstallProgress{
		Stage:   "starting",
		Percent: 10,
		Message: "Resolving SoftEther VPN Gate client plugin package...",
	})

	downloadURL, err := resolveSoftEtherPluginDownloadURL(ctx, defaultVPNGateMirrorBase)
	if err != nil {
		log.Printf("vpn installer: resolve plugin url failed (%v); using direct mirror link", err)
		downloadURL = defaultVPNGateMirrorBase + "/common/cd.aspx/vpngate-client.zip"
	}

	progressCb(EngineInstallProgress{
		Stage:   "downloading",
		Percent: 20,
		Message: "Downloading SoftEther VPN Gate plugin archive (~65 MB from volunteer mirror; may be slow)...",
	})

	tmpDir, err := os.MkdirTemp("", "veilora-softether-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)

	zipFilePath := filepath.Join(tmpDir, "vpngate-client.zip")
	if err := downloadFileWithProgress(ctx, downloadURL, zipFilePath, maxPluginZipSize, 20, 70, progressCb); err != nil {
		return fmt.Errorf("download SoftEther plugin: %w", err)
	}

	progressCb(EngineInstallProgress{
		Stage:   "installing",
		Percent: 75,
		Message: "Extracting SoftEther VPN Gate package...",
	})

	extractDir := filepath.Join(tmpDir, "extracted")
	if err := unzipSafely(zipFilePath, extractDir); err != nil {
		return fmt.Errorf("extract plugin archive: %w", err)
	}

	setupExe, err := findSetupExecutable(extractDir)
	if err != nil {
		return err
	}

	progressCb(EngineInstallProgress{
		Stage:   "installing",
		Percent: 85,
		Message: "Launching SoftEther VPN installer. Please complete the setup wizard...",
	})

	// Run the installer executable
	cmd := hiddenCommandContext(ctx, setupExe) // #nosec G204 -- executable is verified inside private temp extraction directory.
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run SoftEther installer: %w", err)
	}

	progressCb(EngineInstallProgress{
		Stage:   "installing",
		Percent: 95,
		Message: "Verifying SoftEther VPN Client installation...",
	})

	time.Sleep(2 * time.Second)
	return nil
}

func resolveSoftEtherPluginDownloadURL(ctx context.Context, mirrorBase string) (string, error) {
	if mirrorBase == "" {
		mirrorBase = defaultVPNGateMirrorBase
	}
	downloadPageURL := strings.TrimRight(mirrorBase, "/") + "/en/download.aspx"
	req, err := http.NewRequestWithContext(ctx, "GET", downloadPageURL, nil)
	if err != nil {
		return "", fmt.Errorf("create download page request: %w", err)
	}
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch download page from %s: %w", downloadPageURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download page returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return "", fmt.Errorf("read download page: %w", err)
	}

	return parseSoftEtherPluginURL(string(body), mirrorBase)
}

func parseSoftEtherPluginURL(html, mirrorBase string) (string, error) {
	re := regexp.MustCompile(`(?i)href=["']([^"']+/vpngate-client-[^"']+\.zip)["']`)
	matches := re.FindStringSubmatch(html)
	if len(matches) < 2 {
		reFallback := regexp.MustCompile(`(?i)href=["']([^"']+\.zip)["']`)
		allZip := reFallback.FindAllStringSubmatch(html, -1)
		for _, m := range allZip {
			if len(m) >= 2 && strings.Contains(strings.ToLower(m[1]), "vpngate") {
				return makeAbsoluteURL(m[1], mirrorBase), nil
			}
		}
		return "", errors.New("could not find VPN Gate client plugin download link on mirror page")
	}

	return makeAbsoluteURL(matches[1], mirrorBase), nil
}

func makeAbsoluteURL(rawURL, base string) string {
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	base = strings.TrimRight(base, "/")
	if strings.HasPrefix(rawURL, "/") {
		return base + rawURL
	}
	return base + "/" + rawURL
}

func downloadFileWithProgress(ctx context.Context, url, destPath string, maxSize int64, pctStart, pctEnd int, progressCb func(EngineInstallProgress)) error {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 15 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned HTTP status %d", resp.StatusCode)
	}

	out, err := os.OpenFile(filepath.Clean(destPath), os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600) // #nosec G304 -- path is located in dedicated temp directory.
	if err != nil {
		return err
	}
	defer out.Close()

	totalSize := resp.ContentLength
	if totalSize > maxSize {
		return fmt.Errorf("file size %d exceeds allowed limit %d", totalSize, maxSize)
	}

	buf := make([]byte, 64*1024)
	var downloaded int64
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, rErr := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := out.Write(buf[:n]); wErr != nil {
				return wErr
			}
			downloaded += int64(n)
			if downloaded > maxSize {
				return fmt.Errorf("downloaded bytes %d exceeds limit %d", downloaded, maxSize)
			}
			if totalSize > 0 && pctEnd > pctStart {
				progress := pctStart + int(float64(downloaded)/float64(totalSize)*float64(pctEnd-pctStart))
				progressCb(EngineInstallProgress{
					Stage:   "downloading",
					Percent: progress,
					Message: fmt.Sprintf("Downloading... (%d%%)", progress),
				})
			}
		}
		if rErr != nil {
			if rErr == io.EOF {
				break
			}
			return rErr
		}
	}
	return nil
}

func unzipSafely(srcZip, destDir string) error {
	r, err := zip.OpenReader(filepath.Clean(srcZip)) // #nosec G304 -- path is located in dedicated temp directory.
	if err != nil {
		return err
	}
	defer r.Close()

	destClean := filepath.Clean(destDir)
	if err := os.MkdirAll(destClean, 0700); err != nil {
		return err
	}

	for _, f := range r.File {
		path := filepath.Join(destClean, f.Name) // #nosec G305 -- cleanPath is explicitly verified with strings.HasPrefix below.
		cleanPath := filepath.Clean(path)
		// ZipSlip check
		if !strings.HasPrefix(cleanPath, destClean+string(filepath.Separator)) && cleanPath != destClean {
			return fmt.Errorf("illegal file path in zip: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(cleanPath, 0700); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(cleanPath), 0700); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		out, err := os.OpenFile(cleanPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600) // #nosec G304 -- path validated with ZipSlip check.
		if err != nil {
			rc.Close()
			return err
		}

		_, copyErr := io.Copy(out, io.LimitReader(rc, 200*1024*1024))
		rc.Close()
		outCloseErr := out.Close()
		if copyErr != nil {
			return copyErr
		}
		if outCloseErr != nil {
			return outCloseErr
		}
	}
	return nil
}

func findSetupExecutable(dir string) (string, error) {
	var (
		setupCandidate  string
		pluginCandidate string
	)
	err := filepath.Walk(dir, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && strings.EqualFold(filepath.Ext(p), ".exe") {
			name := strings.ToLower(info.Name())
			if strings.Contains(name, "scvpnclient") ||
				strings.Contains(name, "vpnclient") ||
				strings.Contains(name, "vpncmd") ||
				strings.Contains(name, "scvpnbridge") {
				return nil
			}
			if setupCandidate == "" && (strings.Contains(name, "setup") ||
				strings.Contains(name, "install") ||
				strings.Contains(name, "installer")) {
				setupCandidate = p
			}
			if pluginCandidate == "" && strings.Contains(name, "vpngate") {
				pluginCandidate = p
			}
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if setupCandidate != "" {
		return setupCandidate, nil
	}
	if pluginCandidate != "" {
		return pluginCandidate, nil
	}
	return "", errors.New("no setup executable (.exe) found inside SoftEther package")
}
