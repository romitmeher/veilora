package app

import (
	"errors"
	"runtime"
	"testing"

	"github.com/irbis-sh/zen-desktop/internal/vpn"
)

func TestIsCALoadError(t *testing.T) {
	if !isCALoadError(errors.New("CA load: read CA key: access denied")) {
		t.Fatal("CA load error was not detected")
	}
	if isCALoadError(errors.New("create proxy: failed")) {
		t.Fatal("unrelated proxy error was classified as CA load")
	}
}

func TestAppVPNAvailableEngines(t *testing.T) {
	mgr := vpn.NewManager(nil)
	engines := mgr.AvailableEngines()
	if runtime.GOOS == "windows" {
		found := false
		for _, e := range engines {
			if e == vpn.EngineOpenVPN {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("OpenVPN engine was not detected as available")
		}
	}
}
