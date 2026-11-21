// Package vpn manages VPN connections using OpenVPN or SoftEther as the engine,
// fetching server lists from VPNGate, with optional kill switch and DNS leak protection.
package vpn

import (
	"encoding/base64"
	"fmt"
	"log"
	"sync"

	"github.com/irbis-sh/zen-desktop/internal/vpngate"
)

// ConnectionInfo describes an active or last-attempted connection.
type ConnectionInfo struct {
	ServerHostName  string     `json:"serverHostName"`
	ServerIP        string     `json:"serverIP"`
	CountryLong     string     `json:"countryLong"`
	CountryShort    string     `json:"countryShort"`
	Engine          EngineType `json:"engine"`
	Status          Status     `json:"status"`
	KillSwitchOn    bool       `json:"killSwitchOn"`
	DNSProtectionOn bool       `json:"dnsProtectionOn"`
}

// Manager coordinates VPN connections, engine selection, kill switch, and DNS protection.
type Manager struct {
	mu sync.Mutex

	engines  map[EngineType]Engine
	active   Engine
	connInfo ConnectionInfo
	statusCh chan Status
	stopMon  chan struct{}

	killSwitch    *KillSwitch
	dnsProtection *DNSProtection
	vpngateClient *vpngate.Client

	// onStatusChange is called each time the connection status changes.
	onStatusChange func(ConnectionInfo)
}

// NewManager creates a VPN manager with all supported engines registered.
func NewManager(onStatusChange func(ConnectionInfo)) *Manager {
	m := &Manager{
		engines: map[EngineType]Engine{
			EngineOpenVPN:   NewOpenVPNEngine(),
			EngineSoftEther: NewSoftEtherEngine(),
		},
		killSwitch:     NewKillSwitch(),
		dnsProtection:  NewDNSProtection(),
		vpngateClient:  vpngate.NewClient(),
		onStatusChange: onStatusChange,
	}
	m.connInfo.Status = Status{State: StateDisconnected}
	return m
}

// AvailableEngines returns the list of engines available on this system.
func (m *Manager) AvailableEngines() []EngineType {
	var out []EngineType
	for t, e := range m.engines {
		if e.Available() {
			out = append(out, t)
		}
	}
	return out
}

// GetServers fetches the VPNGate server list.
// country filters by ISO code (empty = all), autoRank sorts by score.
func (m *Manager) GetServers(country string, autoRank bool) ([]vpngate.Server, error) {
	return m.vpngateClient.GetServers(country, autoRank)
}

// GetCountries returns the list of country codes available on VPNGate.
func (m *Manager) GetCountries() ([]string, error) {
	return m.vpngateClient.Countries()
}

// ConnectBest selects the best server for the given country and connects.
func (m *Manager) ConnectBest(country string, engine EngineType, killSwitch, dnsProtect bool) error {
	server, err := m.vpngateClient.BestServer(country)
	if err != nil {
		return fmt.Errorf("select best server: %w", err)
	}
	return m.ConnectToServer(*server, engine, killSwitch, dnsProtect)
}

// ConnectToServer connects to a specific VPNGate server.
func (m *Manager) ConnectToServer(server vpngate.Server, engine EngineType, killSwitch, dnsProtect bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.active != nil {
		return fmt.Errorf("already connected — disconnect first")
	}

	eng, ok := m.engines[engine]
	if !ok {
		return fmt.Errorf("unknown engine: %s", engine)
	}
	if !eng.Available() {
		return fmt.Errorf("engine %s is not available on this system", engine)
	}

	if server.OpenVPNConfigBase64 == "" {
		return fmt.Errorf("server %s has no OpenVPN config", server.HostName)
	}

	statusCh := make(chan Status, 16)
	stopMon := make(chan struct{})
	m.statusCh = statusCh
	m.stopMon = stopMon
	m.active = eng
	m.connInfo = ConnectionInfo{
		ServerHostName:  server.HostName,
		ServerIP:        server.IP,
		CountryLong:     server.CountryLong,
		CountryShort:    server.CountryShort,
		Engine:          engine,
		KillSwitchOn:    killSwitch,
		DNSProtectionOn: dnsProtect,
		Status:          Status{State: StateConnecting},
	}

	go m.monitorStatus(statusCh, stopMon, killSwitch, dnsProtect)

	config := []byte(base64.StdEncoding.EncodeToString([]byte(server.OpenVPNConfigBase64)))
	if engine == EngineSoftEther {
		config = []byte(server.OpenVPNConfigBase64)
	}

	if err := eng.Connect(config, statusCh); err != nil {
		m.active = nil
		close(stopMon)
		return fmt.Errorf("connect: %w", err)
	}

	return nil
}

// Disconnect tears down the active VPN connection.
func (m *Manager) Disconnect() error {
	m.mu.Lock()
	eng := m.active
	m.mu.Unlock()

	if eng == nil {
		return nil
	}

	if err := eng.Disconnect(); err != nil {
		return fmt.Errorf("disconnect: %w", err)
	}
	return nil
}

// GetConnectionInfo returns the current connection state.
func (m *Manager) GetConnectionInfo() ConnectionInfo {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connInfo
}

// SetKillSwitch enables or disables the kill switch.
func (m *Manager) SetKillSwitch(enabled bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if enabled {
		return m.killSwitch.Enable()
	}
	return m.killSwitch.Disable()
}

// SetDNSResolver sets a custom DNS resolver address.
func (m *Manager) SetDNSResolver(addr string) error {
	return m.dnsProtection.SetResolver(addr)
}

// GetDNSResolver returns the current DNS resolver address.
func (m *Manager) GetDNSResolver() string {
	return m.dnsProtection.GetResolver()
}

// RefreshServers clears the VPNGate server cache.
func (m *Manager) RefreshServers() {
	m.vpngateClient.InvalidateCache()
}

func (m *Manager) monitorStatus(statusCh <-chan Status, stopMon <-chan struct{}, killSwitch, dnsProtect bool) {
	for {
		select {
		case <-stopMon:
			return
		case s, ok := <-statusCh:
			if !ok {
				return
			}
			m.handleStatusUpdate(s, killSwitch, dnsProtect)
		}
	}
}

func (m *Manager) handleStatusUpdate(s Status, killSwitch, dnsProtect bool) {
	m.mu.Lock()
	m.connInfo.Status = s
	info := m.connInfo
	m.mu.Unlock()

	log.Printf("vpn: state=%s msg=%s", s.State, s.Message)

	switch s.State {
	case StateConnected:
		if dnsProtect {
			if err := m.dnsProtection.Enable(); err != nil {
				log.Printf("vpn: enable DNS protection: %v", err)
			}
		}
		if killSwitch {
			if err := m.killSwitch.Enable(); err != nil {
				log.Printf("vpn: enable kill switch: %v", err)
			}
		}
	case StateDisconnected, StateError:
		if m.dnsProtection.IsEnabled() {
			if err := m.dnsProtection.Disable(); err != nil {
				log.Printf("vpn: disable DNS protection: %v", err)
			}
		}
		if m.killSwitch.IsEnabled() {
			if err := m.killSwitch.Disable(); err != nil {
				log.Printf("vpn: disable kill switch: %v", err)
			}
		}
		m.mu.Lock()
		m.active = nil
		m.mu.Unlock()
	}

	if m.onStatusChange != nil {
		m.onStatusChange(info)
	}
}
