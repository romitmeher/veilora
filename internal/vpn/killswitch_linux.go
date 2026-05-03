//go:build linux

package vpn

import (
	"fmt"
	"os/exec"
)

// enableKillSwitch uses iptables to block all traffic except through tun0.
func enableKillSwitch() error {
	rules := [][]string{
		{"iptables", "-P", "OUTPUT", "DROP"},
		{"iptables", "-A", "OUTPUT", "-o", "lo", "-j", "ACCEPT"},
		{"iptables", "-A", "OUTPUT", "-o", "tun0", "-j", "ACCEPT"},
		// Allow DNS over VPN only.
		{"iptables", "-A", "OUTPUT", "-p", "udp", "--dport", "53", "-o", "tun0", "-j", "ACCEPT"},
	}
	for _, rule := range rules {
		if out, err := exec.Command(rule[0], rule[1:]...).CombinedOutput(); err != nil {
			return fmt.Errorf("iptables rule %v: %w (%s)", rule, err, out)
		}
	}
	return nil
}

// disableKillSwitch restores iptables to permissive defaults.
func disableKillSwitch() error {
	rules := [][]string{
		{"iptables", "-P", "OUTPUT", "ACCEPT"},
		{"iptables", "-F", "OUTPUT"},
	}
	for _, rule := range rules {
		if out, err := exec.Command(rule[0], rule[1:]...).CombinedOutput(); err != nil {
			return fmt.Errorf("iptables rule %v: %w (%s)", rule, err, out)
		}
	}
	return nil
}
