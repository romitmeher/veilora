//go:build windows

package vpn

import (
	"fmt"
	"os/exec"
	"strings"
)

func getSystemDNS() (string, error) {
	out, err := exec.Command("powershell", "-Command",
		"Get-DnsClientServerAddress -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses | Select-Object -First 1",
	).Output()
	if err != nil {
		return "", fmt.Errorf("get DNS: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}

func setSystemDNS(resolver string) error {
	script := fmt.Sprintf(
		`Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses "%s" }`,
		resolver,
	)
	out, err := exec.Command("powershell", "-Command", script).CombinedOutput()
	if err != nil {
		return fmt.Errorf("set DNS: %w (%s)", err, out)
	}
	return nil
}

func restoreSystemDNS(prev string) error {
	server := "8.8.8.8"
	if prev != "" {
		server = strings.TrimSpace(prev)
	}
	script := fmt.Sprintf(
		`Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses "%s" }`,
		server,
	)
	out, err := exec.Command("powershell", "-Command", script).CombinedOutput()
	if err != nil {
		return fmt.Errorf("restore DNS: %w (%s)", err, out)
	}
	return nil
}
