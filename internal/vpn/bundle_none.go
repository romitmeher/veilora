//go:build !windows || !bundledvpn

package vpn

func embeddedVPN() []byte       { return nil }
func embeddedSoftEther() []byte { return nil }
