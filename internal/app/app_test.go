package app

import (
	"errors"
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
	availability := mgr.EngineAvailability()
	if len(availability) == 0 {
		t.Fatal("expected engine availability to report registered engines")
	}
	readyCount := 0
	for _, item := range availability {
		if item.Ready {
			readyCount++
		}
	}
	if len(engines) != readyCount {
		t.Fatalf("AvailableEngines count %d != ready engines count %d", len(engines), readyCount)
	}
}
