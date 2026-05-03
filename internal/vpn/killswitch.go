package vpn

// KillSwitch blocks all non-VPN traffic when enabled.
// Platform-specific implementations are in killswitch_*.go files.
type KillSwitch struct {
	enabled bool
}

func NewKillSwitch() *KillSwitch {
	return &KillSwitch{}
}

// IsEnabled returns whether the kill switch is currently active.
func (k *KillSwitch) IsEnabled() bool {
	return k.enabled
}

// Enable activates the kill switch, blocking non-tunnel traffic.
func (k *KillSwitch) Enable() error {
	if k.enabled {
		return nil
	}
	if err := enableKillSwitch(); err != nil {
		return err
	}
	k.enabled = true
	return nil
}

// Disable deactivates the kill switch, restoring normal traffic.
func (k *KillSwitch) Disable() error {
	if !k.enabled {
		return nil
	}
	if err := disableKillSwitch(); err != nil {
		return err
	}
	k.enabled = false
	return nil
}
