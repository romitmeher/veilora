//go:build (windows && !nobundledvpn) || (windows && bundledvpn)

package vpn

import (
	"debug/pe"
	"golang.org/x/sys/windows"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Inspect PE headers only: do not execute the runtime or install its driver.
func TestEmbeddedRuntimeHasMatchingArchitecture(t *testing.T) {
	for _, key := range []string{"PATH", "ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"} {
		t.Setenv(key, t.TempDir())
	}
	if !NewOpenVPNEngine().Available() {
		t.Fatal("embedded engine requires external installation")
	}
	if NewSoftEtherEngine().Available() != (len(embeddedSoftEther()) > 0) {
		t.Fatal("bundled SoftEther availability does not match the embedded payload")
	}
	dir, err := extractRuntime(embeddedVPN(), t.TempDir(), runtime.GOARCH)
	if err != nil {
		t.Fatal(err)
	}
	want := uint16(pe.IMAGE_FILE_MACHINE_AMD64)
	if runtime.GOARCH == "arm64" {
		want = pe.IMAGE_FILE_MACHINE_ARM64
	}
	systemDir, err := windows.GetSystemDirectory()
	if err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		ext := filepath.Ext(entry.Name())
		if ext != ".exe" && ext != ".dll" && ext != ".sys" {
			continue
		}
		f, err := pe.Open(filepath.Join(dir, entry.Name()))
		if err != nil {
			t.Fatal(err)
		}
		if f.Machine != want {
			t.Errorf("%s has wrong architecture %x", entry.Name(), f.Machine)
		}
		libraries, err := f.ImportedLibraries()
		if err != nil {
			t.Fatal(err)
		}
		for _, library := range libraries {
			lower := strings.ToLower(library)
			if strings.HasPrefix(lower, "api-ms-") || strings.HasPrefix(lower, "ext-ms-") {
				continue
			}
			if _, err := os.Stat(filepath.Join(dir, library)); err == nil {
				continue
			}
			if _, err := os.Stat(filepath.Join(systemDir, library)); err != nil {
				t.Errorf("%s requires unbundled DLL %s", entry.Name(), library)
			}
		}
		f.Close()
	}
}
