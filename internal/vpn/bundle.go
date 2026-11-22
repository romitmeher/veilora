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

func extractRuntime(data []byte, parent, arch string) (result string, err error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("bundled VPN archive: %w", err)
	}
	manifestData, err := r.Open("manifest.json")
	if err != nil {
		return "", err
	}
	var manifest struct {
		Arch  string            `json:"arch"`
		Files map[string]string `json:"files"`
	}
	err = json.NewDecoder(io.LimitReader(manifestData, 1024*1024)).Decode(&manifest)
	manifestData.Close()
	if err != nil {
		return "", err
	}
	if manifest.Arch != arch {
		return "", errors.New("bundled VPN architecture mismatch")
	}
	for _, required := range []string{"openvpn.exe", "tapctl.exe", "OemVista.inf", "tap0901.sys", "tap0901.cat", "vcruntime140.dll"} {
		if manifest.Files[required] == "" {
			return "", fmt.Errorf("bundled VPN missing %s", required)
		}
	}
	dir, err := os.MkdirTemp(parent, "veilora-runtime-")
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
