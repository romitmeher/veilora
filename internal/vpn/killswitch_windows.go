//go:build windows

package vpn

import (
	"fmt"
	"strings"
)

const wfpRuleName = "ZenVPNKillSwitch"

func findVPNInterfaces() []string {
	script := `Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'TAP|OpenVPN|Wintun' -or $_.Name -match 'TAP|OpenVPN|Wintun' } | Select-Object -ExpandProperty Name`
	out, err := hiddenCommand("powershell", "-NoProfile", "-Command", script).Output()
	if err == nil {
		var names []string
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			trimmed := strings.TrimSpace(line)
			if trimmed != "" {
				names = append(names, trimmed)
			}
		}
		if len(names) > 0 {
			return names
		}
	}
	return []string{"OpenVPN TAP-Windows6", "OpenVPN Data Channel Offload", "TAP-Windows Adapter V9"}
}

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
	if out, err := hiddenCommand("netsh", args...).CombinedOutput(); err != nil {
		return fmt.Errorf("netsh add block rule: %w (%s)", err, out)
	}

	for i, ifName := range findVPNInterfaces() {
		ruleName := fmt.Sprintf("%s_VPN_%d", wfpRuleName, i)
		allowArgs := []string{
			"advfirewall", "firewall", "add", "rule",
			"name=" + ruleName,
			"dir=out", "action=allow",
			"protocol=any", "enable=yes",
			"profile=any",
			"interface=" + ifName,
		}
		_ = hiddenCommand("netsh", allowArgs...).Run()
	}
	return nil
}

// disableKillSwitch removes the firewall rules added by enableKillSwitch.
func disableKillSwitch() error {
	_ = hiddenCommand("netsh", "advfirewall", "firewall", "delete", "rule", "name="+wfpRuleName).Run()
	for i := 0; i < 10; i++ {
		ruleName := fmt.Sprintf("%s_VPN_%d", wfpRuleName, i)
		_ = hiddenCommand("netsh", "advfirewall", "firewall", "delete", "rule", "name="+ruleName).Run()
	}
	_ = hiddenCommand("netsh", "advfirewall", "firewall", "delete", "rule", "name="+wfpRuleName+"_VPN").Run()
	return nil
}
