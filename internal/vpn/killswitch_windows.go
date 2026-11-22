//go:build windows

package vpn

import "errors"

// The former blanket block + allow rules blocked the tunnel too. Do not change
// the firewall until a tunnel-aware implementation is available and validated.
func enableKillSwitch() error {
	return errors.New("Windows kill switch is unavailable")
}

func disableKillSwitch() error {
	return errors.New("legacy firewall rules require explicit cleanup; automatic removal is unavailable")
}
