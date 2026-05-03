package app

import "github.com/irbis-sh/zen-desktop/internal/vpn"

const (
	eventVPNStatusChanged = "vpn:statusChanged"
)

func (e *frontendEvents) OnVPNStatusChanged(info vpn.ConnectionInfo) {
	e.emit(eventVPNStatusChanged, info)
}
