//go:build windows

package vpn

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiscoveryRejectsDirectory(t *testing.T) {
	root := t.TempDir()
	for _, key := range []string{"LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)", "PATH"} {
		t.Setenv(key, root)
	}
	candidate := filepath.Join(root, "Veilora", "bin", "openvpn.exe")
	if err := os.MkdirAll(candidate, 0700); err != nil {
		t.Fatal(err)
	}
	if NewOpenVPNEngine().FindBinary() == candidate {
		t.Fatal("directory treated as executable")
	}
}
func TestDNSRestorePreservesPerAdapterFamilies(t *testing.T) {
	snapshot := `[{"guid":"{11111111-1111-1111-1111-111111111111}","ipv4":[],"ipv6":["2606:4700:4700::1111"]},{"guid":"{22222222-2222-2222-2222-222222222222}","ipv4":["9.9.9.9","149.112.112.112"],"ipv6":[]}]`
	plans, err := dnsPlans(snapshot, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(plans) != 4 || len(plans[0].Servers) != 0 || len(plans[1].Servers) != 1 || len(plans[2].Servers) != 2 || len(plans[3].Servers) != 0 {
		t.Fatalf("DHCP/family/secondary servers lost: %+v", plans)
	}
	override, err := dnsPlans(snapshot, "1.1.1.1")
	if err != nil {
		t.Fatal(err)
	}
	if len(override) != 2 || override[0].GUID != plans[0].GUID || override[1].Family != "ipv4" {
		t.Fatal("override used different adapters/family")
	}
	if _, err := dnsPlans(snapshot, `1.1.1.1";bad`); err == nil {
		t.Fatal("invalid resolver accepted")
	}
	if _, err := dnsPlans(`[]`, ""); err == nil {
		t.Fatal("empty snapshot accepted")
	}
	if _, err := dnsPlans(`[{"guid":"bad","ipv4":[],"ipv6":[]}]`, ""); err == nil {
		t.Fatal("invalid GUID accepted")
	}
}
