package vpn

import (
	"errors"
	"testing"
)

func TestDNSSnapshotFailureMakesNoChanges(t *testing.T) {
	d := NewDNSProtection()
	d.snapshot = func() (string, error) { return "", errors.New("snapshot failed") }
	d.apply = func(string, string) error { t.Fatal("DNS changed without snapshot"); return nil }
	if err := d.Enable(); err == nil {
		t.Fatal("snapshot failure ignored")
	}
}
func TestDNSRollbackAndRetry(t *testing.T) {
	d := NewDNSProtection()
	d.snapshot = func() (string, error) { return "original adapter settings", nil }
	d.apply = func(string, string) error { return errors.New("partial apply failure") }
	restores := 0
	d.restore = func(snapshot string) error {
		if snapshot != "original adapter settings" {
			t.Fatal("snapshot lost")
		}
		restores++
		if restores == 1 {
			return errors.New("rollback failed")
		}
		return nil
	}
	if err := d.Enable(); err == nil {
		t.Fatal("failure not surfaced")
	}
	if !d.IsEnabled() {
		t.Fatal("pending cleanup forgotten")
	}
	if err := d.Disable(); err != nil {
		t.Fatal(err)
	}
	if d.IsEnabled() || restores != 2 {
		t.Fatal("cleanup not retried")
	}
}
func TestInstallerArchitectureSelection(t *testing.T) {
	for _, arch := range []string{"amd64", "arm64"} {
		url, err := windowsInstallerURL(arch)
		if err != nil || url != "https://swupdate.openvpn.org/community/releases/OpenVPN-2.7.9-I002-"+arch+".msi" {
			t.Fatalf("wrong installer for %s: %s %v", arch, url, err)
		}
	}
	if _, err := windowsInstallerURL("386"); err == nil {
		t.Fatal("unsupported architecture accepted")
	}
}
