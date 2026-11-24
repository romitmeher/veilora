//go:build !windows || !amd64 || nobundledvpn

package vpn

func embeddedVPN() []byte       { return nil }
func embeddedSoftEther() []byte { return nil }
