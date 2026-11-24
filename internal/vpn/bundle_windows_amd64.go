//go:build (windows && amd64 && !nobundledvpn) || (windows && amd64 && bundledvpn)

package vpn

import _ "embed"

//go:embed payload/windows-amd64.zip
var vpnPayload []byte

//go:embed payload/windows-amd64-softether.zip
var softEtherPayload []byte

func embeddedVPN() []byte { return vpnPayload }

func embeddedSoftEther() []byte { return softEtherPayload }
