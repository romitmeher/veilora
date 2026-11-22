package vpn

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func testRuntime(t *testing.T, extra string, corrupt bool) []byte {
	t.Helper()
	files := map[string]string{}
	for _, name := range []string{"openvpn.exe", "tapctl.exe", "OemVista.inf", "tap0901.sys", "tap0901.cat", "vcruntime140.dll", "licenses/notice.txt"} {
		files[name] = "fixture"
	}
	if extra != "" {
		files[extra] = "fixture"
	}
	hashes := map[string]string{}
	for name, contents := range files {
		h := sha256.Sum256([]byte(contents))
		hashes[name] = hex.EncodeToString(h[:])
	}
	manifest, err := json.Marshal(map[string]any{"arch": "amd64", "files": hashes})
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	files["manifest.json"] = string(manifest)
	if corrupt {
		files["openvpn.exe"] = "tampered"
	}
	for name, value := range files {
		entry, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := entry.Write([]byte(value)); err != nil {
			t.Fatal(err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestRuntimeExtractionWithoutInstalledEngines(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	dir, err := extractRuntime(testRuntime(t, "", false), t.TempDir(), "amd64")
	if err != nil {
		t.Fatal(err)
	}
	if data, err := os.ReadFile(filepath.Join(dir, "openvpn.exe")); err != nil || string(data) != "fixture" {
		t.Fatalf("runtime not extracted: %v", err)
	}
}

func TestRuntimeRejectsInvalidPayloadAndCleansUp(t *testing.T) {
	for _, name := range []string{"../escape.dll", `/absolute.dll`, `licenses\escape.dll`, "file:stream", "alias. ", "OPENVPN.EXE"} {
		t.Run(name, func(t *testing.T) {
			root := t.TempDir()
			if _, err := extractRuntime(testRuntime(t, name, false), root, "amd64"); err == nil {
				t.Fatal("unsafe archive accepted")
			}
			entries, err := os.ReadDir(root)
			if err != nil || len(entries) != 0 {
				t.Fatal("partial runtime left behind")
			}
		})
	}
	if _, err := extractRuntime(testRuntime(t, "", true), t.TempDir(), "amd64"); err == nil {
		t.Fatal("tampered payload accepted")
	}
	if _, err := extractRuntime(testRuntime(t, "", false), t.TempDir(), "arm64"); err == nil {
		t.Fatal("wrong architecture accepted")
	}
}
