//go:build darwin

package vpn

import (
	"fmt"
	"os/exec"
	"strings"
)

func getSystemDNS() (string, error) {
	out, err := exec.Command("networksetup", "-getdnsservers", "Wi-Fi").Output()
	if err != nil {
		// Try Ethernet if Wi-Fi fails.
		out, err = exec.Command("networksetup", "-getdnsservers", "Ethernet").Output()
		if err != nil {
			return "", fmt.Errorf("networksetup getdnsservers: %w", err)
		}
	}
	return strings.TrimSpace(string(out)), nil
}

func setSystemDNS(resolver string) error {
	for _, iface := range []string{"Wi-Fi", "Ethernet"} {
		exec.Command("networksetup", "-setdnsservers", iface, resolver).Run()
	}
	return nil
}

func restoreSystemDNS(prev string) error {
	servers := "Empty"
	if prev != "" && !strings.Contains(prev, "There aren't") {
		servers = prev
	}
	for _, iface := range []string{"Wi-Fi", "Ethernet"} {
		exec.Command("networksetup", "-setdnsservers", iface, servers).Run()
	}
	return nil
}
