//go:build (windows && !nobundledvpn) || (windows && bundledvpn)

package vpn

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"golang.org/x/sys/windows"
)

// Explicitly enabled only on disposable GitHub Windows runners. Ordinary tests
// never execute the daemon, install a driver, or create a network adapter.
func TestNativeRuntimeSmoke(t *testing.T) {
	if os.Getenv("VEILORA_NATIVE_SMOKE") != "1" {
		t.Skip("native smoke test requires an isolated Windows runner")
	}
	if os.Getenv("GITHUB_ACTIONS") != "true" {
		t.Fatal("native smoke test is restricted to GitHub Actions")
	}
	dir, err := extractRuntime(embeddedVPN(), t.TempDir(), runtime.GOARCH)
	if err != nil {
		t.Fatal(err)
	}
	systemDir, err := windows.GetSystemDirectory()
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", systemDir)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	out, err := hiddenCommandContext(ctx, filepath.Join(dir, "openvpn.exe"), "--version").CombinedOutput()
	cancel()
	if err != nil || !strings.Contains(string(out), "OpenVPN 2.7.9") {
		t.Fatalf("source-built daemon failed: %v: %s", err, out)
	}
	id, cleanup, err := prepareBundledAdapter(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := cleanup(); err != nil {
			t.Error(err)
		}
	})
	ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, err = hiddenCommandContext(ctx, filepath.Join(dir, "tapctl.exe"), "list").CombinedOutput()
	if err != nil || !strings.Contains(string(out), id) {
		t.Fatalf("bundled adapter unavailable: %v: %s", err, out)
	}
}
