//go:build (!windows || (windows && !amd64 && !arm64) || nobundledvpn) && !bundledvpn

package vpn

func embeddedVPN() []byte       { return nil }
func embeddedSoftEther() []byte { return nil }
