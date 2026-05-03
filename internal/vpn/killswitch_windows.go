//go:build windows

package vpn

import (
	"fmt"
	"os/exec"
)

const wfpRuleName = "ZenVPNKillSwitch"

// enableKillSwitch uses Windows Firewall (netsh advfirewall) to block outbound traffic
// except on the TAP/TUN adapter used by OpenVPN.
func enableKillSwitch() error {
	args := []string{
		"advfirewall", "firewall", "add", "rule",
		"name=" + wfpRuleName,
		"dir=out", "action=block",
		"protocol=any", "enable=yes",
		"profile=any",
		"interfacetype=any",
	}
	if out, err := exec.Command("netsh", args...).CombinedOutput(); err != nil {
		return fmt.Errorf("netsh add block rule: %w (%s)", err, out)
	}

	allowArgs := []string{
		"advfirewall", "firewall", "add", "rule",
		"name=" + wfpRuleName + "_VPN",
		"dir=out", "action=allow",
		"protocol=any", "enable=yes",
		"profile=any",
		"interface=TAP-Windows Adapter V9",
	}
	if out, err := exec.Command("netsh", allowArgs...).CombinedOutput(); err != nil {
		return fmt.Errorf("netsh add VPN allow rule: %w (%s)", err, out)
	}
	return nil
}

// disableKillSwitch removes the firewall rules added by enableKillSwitch.
func disableKillSwitch() error {
	for _, name := range []string{wfpRuleName, wfpRuleName + "_VPN"} {
		args := []string{"advfirewall", "firewall", "delete", "rule", "name=" + name}
		if out, err := exec.Command("netsh", args...).CombinedOutput(); err != nil {
			return fmt.Errorf("netsh delete rule %s: %w (%s)", name, err, out)
		}
	}
	return nil
}
