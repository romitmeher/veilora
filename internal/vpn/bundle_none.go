//go:build !windows || !bundledvpn

package vpn

func embeddedVPN() []byte { return nil }
