package systray

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"log"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed logo.ico
var logoFS embed.FS

type Manager struct {
	logoBytes         []byte
	appName           string
	proxyStateMu      sync.Mutex
	proxyActive       bool
	proxyStart        func()
	proxyStop         func()
	startStopMenuItem *menuItem
	vpnStateMu        sync.Mutex
	vpnActive         bool
	vpnStart          func()
	vpnStop           func()
	vpnStartStopItem  *menuItem
}

func NewManager(appName string, proxyStart func(), proxyStop func(), vpnStart func(), vpnStop func()) (*Manager, error) {
	if appName == "" {
		return nil, errors.New("appName is empty")
	}
	if proxyStart == nil {
		return nil, errors.New("proxyStart is nil")
	}
	if proxyStop == nil {
		return nil, errors.New("proxyStop is nil")
	}
	if vpnStart == nil {
		return nil, errors.New("vpnStart is nil")
	}
	if vpnStop == nil {
		return nil, errors.New("vpnStop is nil")
	}

	logoBytes, err := logoFS.ReadFile("logo.ico")
	if err != nil {
		return nil, fmt.Errorf("read logo from embed: %w", err)
	}

	return &Manager{
		logoBytes:  logoBytes,
		proxyStart: proxyStart,
		proxyStop:  proxyStop,
		vpnStart:   vpnStart,
		vpnStop:    vpnStop,
		appName:    appName,
	}, nil
}

func (m *Manager) Init(ctx context.Context) error {
	go func() {
		run(m.onReady(ctx), nil)
	}()

	return nil
}

// Quit needs to be called on application quit.
func (m *Manager) Quit() {
	quit()
}

// OnProxyStarted should be called when the proxy gets started.
func (m *Manager) OnProxyStarted() {
	m.proxyStateMu.Lock()
	defer m.proxyStateMu.Unlock()
	m.proxyActive = true

	if m.startStopMenuItem == nil {
		// Sanity check.
		log.Println("startStopMenuItem is nil")
		return
	}

	m.startStopMenuItem.SetTitle("Stop")
	m.startStopMenuItem.SetTooltip("Stop")
}

// OnProxyStopped should be called when the proxy gets stopped.
func (m *Manager) OnProxyStopped() {
	m.proxyStateMu.Lock()
	defer m.proxyStateMu.Unlock()
	m.proxyActive = false

	if m.startStopMenuItem == nil {
		// Sanity check.
		log.Println("startStopMenuItem is nil")
		return
	}

	m.startStopMenuItem.SetTitle("Start")
	m.startStopMenuItem.SetTooltip("Start")
}

func (m *Manager) OnVPNStarted() {
	m.vpnStateMu.Lock()
	defer m.vpnStateMu.Unlock()
	m.vpnActive = true
	if m.vpnStartStopItem != nil {
		m.vpnStartStopItem.SetTitle("Disconnect VPN")
		m.vpnStartStopItem.SetTooltip("Disconnect VPN")
	}
}

func (m *Manager) OnVPNStopped() {
	m.vpnStateMu.Lock()
	defer m.vpnStateMu.Unlock()
	m.vpnActive = false
	if m.vpnStartStopItem != nil {
		m.vpnStartStopItem.SetTitle("Connect VPN")
		m.vpnStartStopItem.SetTooltip("Connect to the best VPN server")
	}
}

func (m *Manager) onReady(ctx context.Context) func() {
	return func() {
		setIcon(m.logoBytes)
		setTooltip(m.appName)

		openMenuItem := addMenuItem("Open", "Open the application window")
		go func() {
			for range openMenuItem.ClickedCh {
				runtime.Show(ctx)
			}
		}()

		m.startStopMenuItem = addMenuItem("Start", "Start")
		go func() {
			for range m.startStopMenuItem.ClickedCh {
				m.proxyStateMu.Lock()
				active := m.proxyActive
				m.proxyStateMu.Unlock()
				if active {
					m.proxyStop()
				} else {
					m.proxyStart()
				}
			}
		}()

		m.vpnStartStopItem = addMenuItem("Connect VPN", "Connect to the best VPN server")
		go func() {
			for range m.vpnStartStopItem.ClickedCh {
				m.vpnStateMu.Lock()
				active := m.vpnActive
				m.vpnStateMu.Unlock()
				if active {
					m.vpnStop()
				} else {
					m.vpnStart()
				}
			}
		}()

		addSeparator()

		quitMenuItem := addMenuItem("Quit", "Quit the application")
		go func() {
			for range quitMenuItem.ClickedCh {
				runtime.Quit(ctx)
			}
		}()
	}
}
