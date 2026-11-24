//go:build windows && arm64 && bundledvpn_arm64

package vpn

import _ "embed"

//go:embed payload/windows-arm64.zip
var vpnPayload []byte

func embeddedVPN() []byte { return vpnPayload }

func embeddedSoftEther() []byte { return nil }
