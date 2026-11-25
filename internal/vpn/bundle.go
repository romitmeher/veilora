package vpn

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

var bundleState struct {
	sync.Mutex
	dir string
}

var softEtherBundleState struct {
	sync.Mutex
	dir string
}

// A fresh private directory avoids trusting an old, editable runtime cache.
func bundledBinary() (string, error) {
	bundleState.Lock()
	defer bundleState.Unlock()
	if bundleState.dir == "" {
		dir, err := extractRuntime(embeddedVPN(), "", runtime.GOARCH)
		if err != nil {
			return "", err
		}
		bundleState.dir = dir
	}
	return filepath.Join(bundleState.dir, "openvpn.exe"), nil
}

// CleanupBundledRuntime releases only this process's extracted files, after VPN shutdown.
func CleanupBundledRuntime() {
	bundleState.Lock()
	defer bundleState.Unlock()
	if bundleState.dir != "" {
		_ = os.RemoveAll(bundleState.dir)
		bundleState.dir = ""
	}
}

func bundledSoftEtherBinary() (string, error) {
	softEtherBundleState.Lock()
	defer softEtherBundleState.Unlock()
	if softEtherBundleState.dir == "" {
		dir, err := extractNamedRuntime(embeddedSoftEther(), "", runtime.GOARCH, "softether",
			[]string{"vpnclient.exe", "vpncmd.exe", "vpndrvinst.exe", "hamcore.se2"})
		if err != nil {
			return "", err
		}
		softEtherBundleState.dir = dir
	}
	return filepath.Join(softEtherBundleState.dir, "vpnclient.exe"), nil
}

func bundledSoftEtherRuntimeDir() (string, error) {
	if _, err := bundledSoftEtherBinary(); err != nil {
		return "", err
	}
	softEtherBundleState.Lock()
	defer softEtherBundleState.Unlock()
	return softEtherBundleState.dir, nil
}

// CleanupBundledSoftEtherRuntime releases only this process's temporary extracted SoftEther files.
// Persistent service runtimes in ProgramData are never removed by process exit.
func CleanupBundledSoftEtherRuntime() {
	softEtherBundleState.Lock()
	defer softEtherBundleState.Unlock()
	if softEtherBundleState.dir != "" {
		_ = os.RemoveAll(softEtherBundleState.dir)
		softEtherBundleState.dir = ""
	}
}

type bundleManifest struct {
	Engine     string            `json:"engine"`
	Arch       string            `json:"arch"`
	Provenance string            `json:"provenance"`
	Files      map[string]string `json:"files"`
}

func readAndValidateManifest(data []byte, arch, engine string, required []string) (*zip.Reader, bundleManifest, string, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, bundleManifest{}, "", fmt.Errorf("bundled %s archive: %w", engine, err)
	}
	manifestFile, err := r.Open("manifest.json")
	if err != nil {
		return nil, bundleManifest{}, "", fmt.Errorf("bundled %s manifest: %w", engine, err)
	}
	rawManifest, err := io.ReadAll(io.LimitReader(manifestFile, 1024*1024))
	manifestFile.Close()
	if err != nil {
		return nil, bundleManifest{}, "", err
	}
	var manifest bundleManifest
	if err := json.Unmarshal(rawManifest, &manifest); err != nil {
		return nil, bundleManifest{}, "", err
	}
	if manifest.Arch != arch {
		return nil, bundleManifest{}, "", fmt.Errorf("bundled %s architecture mismatch", engine)
	}
	if manifest.Engine != "" && manifest.Engine != engine {
		return nil, bundleManifest{}, "", fmt.Errorf("bundled runtime engine mismatch: got %q, want %q", manifest.Engine, engine)
	}
	for _, name := range required {
		if manifest.Files[name] == "" {
			return nil, bundleManifest{}, "", fmt.Errorf("bundled %s missing %s", engine, name)
		}
	}
	sum := sha256.Sum256(rawManifest)
	return r, manifest, hex.EncodeToString(sum[:]), nil
}

func validatePersistentSoftEtherRuntime(targetDir, expectedManifestHash string) error {
	if targetDir == "" || len(embeddedSoftEther()) == 0 {
		return errors.New("persistent SoftEther runtime is not configured")
	}
	required := []string{"vpnclient.exe", "vpncmd.exe", "vpndrvinst.exe", "hamcore.se2"}
	_, manifest, manifestHash, err := readAndValidateManifest(embeddedSoftEther(), runtime.GOARCH, "softether", required)
	if err != nil {
		return err
	}
	if expectedManifestHash != "" && manifestHash != expectedManifestHash {
		return errors.New("persistent SoftEther runtime manifest hash mismatch")
	}
	for _, name := range required {
		data, readErr := os.ReadFile(filepath.Join(targetDir, filepath.FromSlash(name)))
		if readErr != nil {
			return fmt.Errorf("persistent SoftEther runtime missing %s: %w", name, readErr)
		}
		sum := sha256.Sum256(data)
		if hex.EncodeToString(sum[:]) != manifest.Files[name] {
			return fmt.Errorf("persistent SoftEther runtime integrity failure: %s", name)
		}
	}
	return nil
}

func installPersistentSoftEtherRuntime(targetDir string) (string, error) {
	if len(embeddedSoftEther()) == 0 {
		return "", errors.New("no bundled SoftEther runtime")
	}
	required := []string{"vpnclient.exe", "vpncmd.exe", "vpndrvinst.exe", "hamcore.se2"}
	_, _, manifestHash, err := readAndValidateManifest(embeddedSoftEther(), runtime.GOARCH, "softether", required)
	if err == nil && validatePersistentSoftEtherRuntime(targetDir, manifestHash) == nil {
		return manifestHash, nil
	}
	if err := os.MkdirAll(filepath.Dir(targetDir), 0700); err != nil {
		return "", err
	}
	stagingDir, err := extractNamedRuntime(embeddedSoftEther(), filepath.Dir(targetDir), runtime.GOARCH, "softether", required)
	if err != nil {
		return "", err
	}
	if removeErr := os.RemoveAll(targetDir); removeErr != nil {
		_ = os.RemoveAll(stagingDir)
		return "", fmt.Errorf("replace persistent SoftEther runtime: %w", removeErr)
	}
	if renameErr := os.Rename(stagingDir, targetDir); renameErr != nil {
		_ = os.RemoveAll(stagingDir)
		return "", fmt.Errorf("install persistent SoftEther runtime: %w", renameErr)
	}
	return manifestHash, nil
}

func extractRuntime(data []byte, parent, arch string) (result string, err error) {
	return extractNamedRuntime(data, parent, arch, "openvpn",
		[]string{"openvpn.exe", "tapctl.exe", "OemVista.inf", "tap0901.sys", "tap0901.cat", "vcruntime140.dll"})
}

func extractNamedRuntime(data []byte, parent, arch, engine string, required []string) (result string, err error) {
	r, manifest, _, err := readAndValidateManifest(data, arch, engine, required)
	if err != nil {
		return "", err
	}
	dir, err := os.MkdirTemp(parent, "veilora-"+engine+"-runtime-")
	if err != nil {
		return "", err
	}
	defer func() {
		if err != nil {
			_ = os.RemoveAll(dir)
		}
	}()
	seen := make(map[string]bool)
	var total uint64
	for _, f := range r.File {
		if f.Name == "manifest.json" {
			continue
		}
		name := f.Name
		// Reject Windows ADS, device paths, alternate separators, aliases and links.
		if name == "" || path.Clean(name) != name || strings.ContainsAny(name, `\:`) || strings.HasPrefix(name, "/") || strings.HasPrefix(name, "../") || f.Mode()&os.ModeSymlink != 0 {
			return "", errors.New("invalid bundled VPN path")
		}
		for _, part := range strings.Split(name, "/") {
			if strings.TrimRight(part, ". ") != part {
				return "", errors.New("invalid bundled VPN filename")
			}
		}
		key := strings.ToLower(name)
		if seen[key] || manifest.Files[name] == "" {
			return "", errors.New("unexpected bundled VPN file")
		}
		seen[key] = true
		total += f.UncompressedSize64
		if f.UncompressedSize64 > 32*1024*1024 || total > 100*1024*1024 {
			return "", errors.New("bundled VPN exceeds size limit")
		}
		src, openErr := f.Open()
		if openErr != nil {
			return "", openErr
		}
		contents, readErr := io.ReadAll(io.LimitReader(src, 32*1024*1024+1))
		src.Close()
		if readErr != nil {
			return "", readErr
		}
		hash := sha256.Sum256(contents)
		if hex.EncodeToString(hash[:]) != manifest.Files[name] {
			return "", fmt.Errorf("bundled VPN integrity failure: %s", name)
		}
		target := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(target), 0700); err != nil {
			return "", err
		}
		if err := os.WriteFile(target, contents, 0600); err != nil {
			return "", err
		}
	}
	if len(seen) != len(manifest.Files) {
		return "", errors.New("bundled VPN archive is incomplete")
	}
	return dir, nil
}
