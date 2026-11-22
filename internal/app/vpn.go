package app

import (
	"fmt"
	"log"

	"github.com/irbis-sh/zen-desktop/internal/vpn"
	"github.com/irbis-sh/zen-desktop/internal/vpngate"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// VPNGetServers returns the VPNGate server list.
// country: ISO-3166 code to filter (e.g. "JP"), empty for all.
// autoRank: if true, sorted by computed score (speed/ping/uptime).
func (a *App) VPNGetServers(country string, autoRank bool) ([]vpngate.Server, error) {
	<-a.startupDone
	servers, err := a.vpnManager.GetServers(country, autoRank)
	if err != nil {
		log.Printf("vpn: get servers: %v", err)
		return nil, err
	}
	return servers, nil
}

// VPNGetCountries returns available VPNGate country codes.
func (a *App) VPNGetCountries() ([]string, error) {
	<-a.startupDone
	countries, err := a.vpnManager.GetCountries()
	if err != nil {
		log.Printf("vpn: get countries: %v", err)
		return nil, err
	}
	return countries, nil
}

// VPNAvailableEngines returns the list of VPN engines available on this system.
func (a *App) VPNAvailableEngines() []vpn.EngineType {
	<-a.startupDone
	return a.vpnManager.AvailableEngines()
}

// VPNConnectBest auto-selects the best server and connects.
// country: ISO code or empty for global best.
// engine: "openvpn" or "softether".
// killSwitch: block traffic if VPN drops.
// dnsProtect: override system DNS through VPN.
func (a *App) VPNConnectBest(country string, engine vpn.EngineType, killSwitch, dnsProtect bool) error {
	<-a.startupDone
	err := a.vpnManager.ConnectBest(country, engine, killSwitch, dnsProtect)
	if err != nil {
		log.Printf("vpn: connect best: %v", err)
	}
	return err
}

// VPNConnectToServer connects to a specific VPNGate server by hostname.
func (a *App) VPNConnectToServer(hostName string, engine vpn.EngineType, killSwitch, dnsProtect bool) error {
	<-a.startupDone
	servers, err := a.vpnManager.GetServers("", false)
	if err != nil {
		return fmt.Errorf("fetch server list: %w", err)
	}
	for _, s := range servers {
		if s.HostName == hostName {
			return a.vpnManager.ConnectToServer(s, engine, killSwitch, dnsProtect)
		}
	}
	return fmt.Errorf("server not found: %s", hostName)
}

// VPNDisconnect tears down the active VPN connection.
func (a *App) VPNDisconnect() error {
	<-a.startupDone
	err := a.vpnManager.Disconnect()
	if err != nil {
		log.Printf("vpn: disconnect: %v", err)
	}
	return err
}

// VPNGetStatus returns the current VPN connection info.
func (a *App) VPNGetStatus() vpn.ConnectionInfo {
	<-a.startupDone
	return a.vpnManager.GetConnectionInfo()
}

// VPNSetKillSwitch enables or disables the kill switch independently of a connection.
func (a *App) VPNSetKillSwitch(enabled bool) error {
	<-a.startupDone
	err := a.vpnManager.SetKillSwitch(enabled)
	if err != nil {
		log.Printf("vpn: set kill switch: %v", err)
	}
	return err
}

// VPNSetDNSResolver sets a custom DNS resolver for DNS leak protection.
func (a *App) VPNSetDNSResolver(addr string) error {
	<-a.startupDone
	return a.vpnManager.SetDNSResolver(addr)
}

// VPNGetDNSResolver returns the current DNS resolver address.
func (a *App) VPNGetDNSResolver() string {
	<-a.startupDone
	return a.vpnManager.GetDNSResolver()
}

// VPNRefreshServers clears the VPNGate server cache, forcing a fresh fetch on the next call.
func (a *App) VPNRefreshServers() {
	<-a.startupDone
	a.vpnManager.RefreshServers()
}

// VPNInstallEngine runs the in-app engine installer to download and configure OpenVPN or SoftEther.
func (a *App) VPNInstallEngine(engine string) error {
	<-a.startupDone
	target := vpn.EngineOpenVPN
	if engine == string(vpn.EngineSoftEther) {
		target = vpn.EngineSoftEther
	}
	return vpn.InstallEngineType(a.ctx, target, func(progress vpn.EngineInstallProgress) {
		runtime.EventsEmit(a.ctx, "vpn:engine:progress", progress)
	})
}
