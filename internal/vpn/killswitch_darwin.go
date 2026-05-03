//go:build darwin

package vpn

import (
	"fmt"
	"os"
	"os/exec"
)

const pfAnchor = "zen_killswitch"

const pfRules = `
anchor "` + pfAnchor + `" {
  block out all
  pass out on lo0 all
  pass out on utun0 all
  pass out on utun1 all
  pass out on utun2 all
}
`

// enableKillSwitch uses pf (Packet Filter) on macOS to block non-VPN traffic.
func enableKillSwitch() error {
	f, err := os.CreateTemp("", "zen-pf-*.conf")
	if err != nil {
		return fmt.Errorf("create pf rules file: %w", err)
	}
	defer os.Remove(f.Name())

	if _, err := f.WriteString(pfRules); err != nil {
		return fmt.Errorf("write pf rules: %w", err)
	}
	f.Close()

	if out, err := exec.Command("pfctl", "-a", pfAnchor, "-f", f.Name()).CombinedOutput(); err != nil {
		return fmt.Errorf("pfctl load rules: %w (%s)", err, out)
	}
	if out, err := exec.Command("pfctl", "-e").CombinedOutput(); err != nil {
		return fmt.Errorf("pfctl enable: %w (%s)", err, out)
	}
	return nil
}

// disableKillSwitch removes the pf anchor added by enableKillSwitch.
func disableKillSwitch() error {
	if out, err := exec.Command("pfctl", "-a", pfAnchor, "-F", "all").CombinedOutput(); err != nil {
		return fmt.Errorf("pfctl flush anchor: %w (%s)", err, out)
	}
	return nil
}
