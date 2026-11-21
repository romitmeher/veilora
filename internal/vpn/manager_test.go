package vpn

import (
	"encoding/base64"
	"errors"
	"testing"

	"github.com/irbis-sh/zen-desktop/internal/vpngate"
)

// No VPN process, network adapter, DNS setting, or firewall is used by these tests.
type recordingEngine struct {
	available bool
	config    []byte
	err       error
}

func (*recordingEngine) Name() string      { return "test" }
func (e *recordingEngine) Available() bool { return e.available }
func (e *recordingEngine) Connect(config []byte, _ chan<- Status) error {
	e.config = append([]byte(nil), config...)
	return e.err
}
func (*recordingEngine) Disconnect() error { return nil }

func testManager(t *testing.T, engine EngineType, fake *recordingEngine) *Manager {
	t.Helper()
	m := NewManager(nil)
	m.engines = map[EngineType]Engine{engine: fake}
	t.Cleanup(func() {
		m.mu.Lock()
		defer m.mu.Unlock()
		if m.stopMon != nil {
			select {
			case <-m.stopMon:
			default:
				close(m.stopMon)
			}
		}
	})
	return m
}

func TestVPNGateConfigDecodesExactlyOnce(t *testing.T) {
	plain := "client\ndev tun\nremote vpn.example.test 1194\n"
	server := vpngate.Server{OpenVPNConfigBase64: base64.StdEncoding.EncodeToString([]byte(plain))}
	for _, engine := range []EngineType{EngineOpenVPN, EngineSoftEther} {
		t.Run(string(engine), func(t *testing.T) {
			fake := &recordingEngine{available: true}
			m := testManager(t, engine, fake)
			if err := m.ConnectToServer(server, engine, false, false); err != nil {
				t.Fatal(err)
			}
			decoded, err := base64.StdEncoding.DecodeString(string(fake.config))
			if err != nil || string(decoded) != plain {
				t.Fatalf("engine did not receive a once-encoded OpenVPN profile: decoded=%q, err=%v", decoded, err)
			}
		})
	}
}

func TestConnectFailureDoesNotLeaveConnectingState(t *testing.T) {
	fake := &recordingEngine{available: true, err: errors.New("engine startup failed")}
	m := testManager(t, EngineOpenVPN, fake)
	var notified bool
	m.onStatusChange = func(info ConnectionInfo) {
		notified = true
		if info.Status.State != StateError || m.GetConnectionInfo().Status.State != StateError {
			t.Error("failure notification must contain the stored error state")
		}
	}
	server := vpngate.Server{OpenVPNConfigBase64: base64.StdEncoding.EncodeToString([]byte("client\n"))}
	if err := m.ConnectToServer(server, EngineOpenVPN, false, false); err == nil {
		t.Fatal("expected startup error")
	}
	if got := m.GetConnectionInfo().Status.State; got != StateError {
		t.Fatalf("state after startup failure = %q, want error", got)
	}
	if m.active != nil {
		t.Fatal("failed engine remains active")
	}
	if !notified {
		t.Fatal("frontend was not notified of startup failure")
	}
}

func TestMissingEngineDoesNotAttemptConnection(t *testing.T) {
	fake := &recordingEngine{}
	m := testManager(t, EngineOpenVPN, fake)
	if got := m.AvailableEngines(); len(got) != 0 {
		t.Fatalf("missing engine advertised as available: %v", got)
	}
	if err := m.ConnectToServer(vpngate.Server{OpenVPNConfigBase64: "fixture"}, EngineOpenVPN, false, false); err == nil {
		t.Fatal("connection accepted without an installed engine")
	}
	if fake.config != nil {
		t.Fatal("unavailable engine was invoked")
	}
}
