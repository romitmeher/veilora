//go:build windows

package vpn

import (
	"errors"
	"path/filepath"
	"reflect"
	"testing"
)

func TestBundledAdapterSetupAndCleanup(t *testing.T) {
	var calls [][]string
	guid := "{11111111-1111-1111-1111-111111111111}"
	run := func(exe string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{filepath.Base(exe)}, args...))
		if args[0] == "create" {
			return []byte(guid + "\tveilora-runtime-test\troot\\tap0901\r\n"), nil
		}
		return nil, nil
	}
	dir := filepath.Join(t.TempDir(), "veilora-runtime-test")
	id, cleanup, err := createBundledAdapter(dir, "pnputil.exe", run)
	if err != nil || id != guid {
		t.Fatalf("setup: %s %v", id, err)
	}
	if err := cleanup(); err != nil {
		t.Fatal(err)
	}
	want := [][]string{
		{"pnputil.exe", "/add-driver", filepath.Join(dir, "OemVista.inf")},
		{"tapctl.exe", "create", "--hwid", `root\tap0901`, "--name", "veilora-runtime-test"},
		{"tapctl.exe", "delete", guid},
	}
	if !reflect.DeepEqual(calls, want) {
		t.Fatalf("commands: %#v", calls)
	}
}

func TestBundledAdapterStopsOnDriverFailure(t *testing.T) {
	calls := 0
	_, cleanup, err := createBundledAdapter(t.TempDir(), "pnputil.exe", func(string, ...string) ([]byte, error) {
		calls++
		return nil, errors.New("permission denied")
	})
	if err == nil || cleanup != nil || calls != 1 {
		t.Fatal("continued after driver staging failed")
	}
}

func TestEngineRetainsFailedAdapterCleanup(t *testing.T) {
	calls := 0
	e := NewOpenVPNEngine()
	e.cleanupAdapter = func() error {
		calls++
		if calls == 1 {
			return errors.New("adapter busy")
		}
		return nil
	}
	if err := e.Disconnect(); err == nil || e.cleanupAdapter == nil {
		t.Fatal("cleanup failure lost")
	}
	if err := e.Disconnect(); err != nil || e.cleanupAdapter != nil {
		t.Fatal("cleanup retry failed")
	}
	if err := e.Disconnect(); err != nil || calls != 2 {
		t.Fatal("cleanup was not idempotent")
	}
}
