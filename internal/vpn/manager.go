// Package vpn manages VPN connections using OpenVPN or SoftEther as the engine,
// fetching server lists from VPNGate, with optional kill switch and DNS leak protection.
package vpn

import (
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

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
	mu       sync.Mutex
	notifyMu sync.Mutex

	engines        map[EngineType]Engine
	active         Engine
	connInfo       ConnectionInfo
	statusCh       chan Status
	stopMon        chan struct{}
	autoCancel     chan struct{}
	requestID      uint64
	retryInterval  time.Duration
	connectTimeout time.Duration

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
		dnsProtection:  NewDNSProtection(),
		vpngateClient:  vpngate.NewClient(),
		onStatusChange: onStatusChange,
		retryInterval:  100 * time.Millisecond,
		connectTimeout: 15 * time.Second,
	}
	m.connInfo.Status = Status{State: StateDisconnected}
	m.connInfo.DNSProtectionOn = false
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

// ConnectBest selects the best server for the given country and connects, with auto-failover
// to the next best servers if the first fails to connect within 15 seconds.
func (m *Manager) ConnectBest(country string, engine EngineType, killSwitch, dnsProtect bool) error {
	m.mu.Lock()
	if m.active != nil {
		m.mu.Unlock()
		return errors.New("already connected — disconnect first")
	}
	m.requestID++
	requestID := m.requestID
	m.mu.Unlock()
	servers, err := m.vpngateClient.GetServers(country, true)
	if err != nil {
		return fmt.Errorf("select best server: %w", err)
	}
	return m.connectCandidatesFor(servers, engine, killSwitch, dnsProtect, requestID)
}

func (m *Manager) connectCandidates(servers []vpngate.Server, engine EngineType, killSwitch, dnsProtect bool) error {
	return m.connectCandidatesFor(servers, engine, killSwitch, dnsProtect, 0)
}

func (m *Manager) connectCandidatesFor(servers []vpngate.Server, engine EngineType, killSwitch, dnsProtect bool, requestID uint64) error {
	if killSwitch {
		return errors.New("kill switch is unavailable: a verified tunnel-aware implementation is required")
	}
	if len(servers) == 0 {
		return errors.New("no VPN servers found")
	}
	if len(servers) > 3 {
		servers = servers[:3]
	}
	m.mu.Lock()
	if requestID != 0 && requestID != m.requestID {
		m.mu.Unlock()
		return errors.New("connection request was cancelled")
	}
	if requestID == 0 {
		m.requestID++
	}
	if m.active != nil {
		m.mu.Unlock()
		return errors.New("already connected — disconnect first")
	}
	m.cancelAutoLocked()
	cancel := make(chan struct{})
	m.autoCancel = cancel
	var err error
	var next int
	for next = 0; next < len(servers); next++ {
		err = m.connectLocked(servers[next], engine, dnsProtect)
		if err == nil || m.active != nil {
			next++
			break
		}
	}
	info := m.connInfo
	m.mu.Unlock()
	m.notify(info)
	if err == nil {
		go m.autoFailoverMonitor(servers[next:], engine, dnsProtect, cancel)
	}
	return err
}

func (m *Manager) cancelAutoLocked() {
	if m.autoCancel != nil {
		close(m.autoCancel)
		m.autoCancel = nil
	}
}

// Each supervisor belongs to one user connection request. Cancellation and retries
// share the manager lock, so Disconnect cannot be followed by an old auto-retry.
func (m *Manager) autoFailoverMonitor(backups []vpngate.Server, engine EngineType, dnsProtect bool, cancel <-chan struct{}) {
	timer := time.NewTimer(m.connectTimeout)
	defer timer.Stop()
	ticker := time.NewTicker(m.retryInterval)
	defer ticker.Stop()
	for {
		timedOut := false
		select {
		case <-cancel:
			return
		case <-timer.C:
			timedOut = true
		case <-ticker.C:
		}
		m.mu.Lock()
		if m.autoCancel != cancel {
			m.mu.Unlock()
			return
		}
		state := m.connInfo.Status.State
		if state == StateConnected || state == StateDisconnected {
			m.mu.Unlock()
			return
		}
		if !timedOut && state != StateError {
			m.mu.Unlock()
			continue
		}
		if err := m.disconnectLocked(); err != nil {
			m.connInfo.Status = Status{State: StateError, Message: err.Error()}
			info := m.connInfo
			m.mu.Unlock()
			m.notify(info)
			return
		}
		err := errors.New("all VPN connection attempts failed")
		if timedOut {
			err = errors.New("VPN connection timed out")
		}
		for len(backups) > 0 {
			server := backups[0]
			backups = backups[1:]
			err = m.connectLocked(server, engine, dnsProtect)
			if err == nil || m.active != nil {
				break
			}
		}
		if err != nil {
			m.connInfo.Status = Status{State: StateError, Message: err.Error()}
		}
		info := m.connInfo
		m.mu.Unlock()
		m.notify(info)
		if err != nil {
			return
		}
		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
		timer.Reset(m.connectTimeout)
	}
}

// ConnectToServer connects to a specific VPNGate server.
func (m *Manager) ConnectToServer(server vpngate.Server, engine EngineType, killSwitch, dnsProtect bool) error {
	if killSwitch {
		return errors.New("kill switch is unavailable: a verified tunnel-aware implementation is required")
	}
	m.mu.Lock()
	if m.active != nil {
		m.mu.Unlock()
		return errors.New("already connected — disconnect first")
	}
	m.requestID++
	m.cancelAutoLocked()
	err := m.connectLocked(server, engine, dnsProtect)
	info := m.connInfo
	m.mu.Unlock()
	m.notify(info)
	return err
}

func (m *Manager) connectLocked(server vpngate.Server, engine EngineType, dnsProtect bool) error {
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
	if m.dnsProtection.IsEnabled() {
		return errors.New("restore pending DNS settings before reconnecting")
	}
	m.stopMonitorLocked()
	statusCh := make(chan Status, 16)
	stopMon := make(chan struct{})
	m.statusCh, m.stopMon, m.active = statusCh, stopMon, eng
	m.connInfo = ConnectionInfo{
		ServerHostName: server.HostName, ServerIP: server.IP, CountryLong: server.CountryLong,
		CountryShort: server.CountryShort, Engine: engine, Status: Status{State: StateConnecting},
	}
	if err := eng.Connect([]byte(server.OpenVPNConfigBase64), statusCh); err != nil {
		cleanupErr := eng.Disconnect()
		if cleanupErr == nil {
			m.active = nil
		}
		m.stopMonitorLocked()
		err = errors.Join(err, cleanupErr)
		m.connInfo.Status = Status{State: StateError, Message: fmt.Sprintf("connect: %v", err)}
		return fmt.Errorf("connect: %w", err)
	}
	go m.monitorStatus(statusCh, stopMon, dnsProtect)
	return nil
}

func (m *Manager) stopMonitorLocked() {
	if m.stopMon != nil {
		close(m.stopMon)
		m.stopMon = nil
	}
}

func (m *Manager) disconnectLocked() error {
	m.stopMonitorLocked()
	var err error
	if m.active != nil {
		err = m.active.Disconnect()
	}
	if err == nil {
		m.active = nil
	}
	err = errors.Join(err, m.dnsProtection.Disable())
	m.connInfo.DNSProtectionOn = m.connInfo.Status.State == StateConnected && m.dnsProtection.IsEnabled()
	m.connInfo.KillSwitchOn = false
	return err
}

func (m *Manager) Disconnect() error {
	m.mu.Lock()
	m.requestID++
	m.cancelAutoLocked()
	err := m.disconnectLocked()
	m.connInfo.Status = Status{State: StateDisconnected}
	m.connInfo.DNSProtectionOn = false
	if err != nil {
		m.connInfo.Status = Status{State: StateError, Message: err.Error()}
	}
	info := m.connInfo
	m.mu.Unlock()
	m.notify(info)
	return err
}

func (m *Manager) notify(_ ConnectionInfo) {
	m.notifyMu.Lock()
	defer m.notifyMu.Unlock()
	m.mu.Lock()
	info := m.connInfo
	m.mu.Unlock()
	if m.onStatusChange != nil {
		m.onStatusChange(info)
	}
}

// GetConnectionInfo returns the current connection state.
func (m *Manager) GetConnectionInfo() ConnectionInfo {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connInfo
}

// SetKillSwitch enables or disables the kill switch.
func (m *Manager) SetKillSwitch(enabled bool) error {
	if enabled {
		return errors.New("kill switch is unavailable: a verified tunnel-aware implementation is required")
	}
	return nil
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

func (m *Manager) monitorStatus(statusCh <-chan Status, stopMon <-chan struct{}, dnsProtect bool) {
	for {
		select {
		case <-stopMon:
			return
		case status, ok := <-statusCh:
			if !ok {
				status = Status{State: StateError, Message: "VPN engine stopped reporting status"}
			}
			m.handleStatusUpdate(status, stopMon, dnsProtect)
			if !ok || status.State == StateError || status.State == StateDisconnected {
				return
			}
		}
	}
}

func (m *Manager) handleStatusUpdate(status Status, source <-chan struct{}, dnsProtect bool) {
	m.mu.Lock()
	if source != m.stopMon || source == nil {
		m.mu.Unlock()
		return
	}
	log.Printf("vpn: state=%s msg=%s", status.State, status.Message)
	if status.State == StateConnected && dnsProtect {
		if err := m.dnsProtection.Enable(); err != nil {
			status = Status{State: StateError, Message: fmt.Sprintf("DNS setup failed: %v", err)}
		}
	}
	if status.State == StateDisconnected || status.State == StateError {
		if err := m.disconnectLocked(); err != nil {
			status = Status{State: StateError, Message: status.Message + "; cleanup failed: " + err.Error()}
		}
	}
	m.connInfo.Status = status
	m.connInfo.DNSProtectionOn = m.connInfo.Status.State == StateConnected && m.dnsProtection.IsEnabled()
	m.connInfo.KillSwitchOn = false
	info := m.connInfo
	m.mu.Unlock()
	m.notify(info)
}
