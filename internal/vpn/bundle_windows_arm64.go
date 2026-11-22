//go:build windows && arm64 && bundledvpn

package vpn

import _ "embed"

//go:embed payload/windows-arm64.zip
var vpnPayload []byte

func embeddedVPN() []byte { return vpnPayload }
