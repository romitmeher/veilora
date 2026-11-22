//go:build windows && amd64 && bundledvpn

package vpn

import _ "embed"

//go:embed payload/windows-amd64.zip
var vpnPayload []byte

func embeddedVPN() []byte { return vpnPayload }
