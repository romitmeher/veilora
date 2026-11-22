package vpn

import (
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/irbis-sh/zen-desktop/internal/vpngate"
)

type testAttempt struct {
	status chan<- Status
	config string
}
type scenarioEngine struct {
	attempts  chan testAttempt
	count     atomic.Int32
	failFirst bool
}

func (*scenarioEngine) Name() string    { return "fixture" }
func (*scenarioEngine) Available() bool { return true }
func (e *scenarioEngine) Connect(config []byte, status chan<- Status) error {
	n := e.count.Add(1)
	e.attempts <- testAttempt{status, string(config)}
	if e.failFirst && n == 1 {
		return errors.New("fixture startup failure")
	}
	return nil
}
func (*scenarioEngine) Disconnect() error { return nil }

func newSupervisorFixture(t *testing.T) (*Manager, *scenarioEngine) {
	t.Helper()
	e := &scenarioEngine{attempts: make(chan testAttempt, 8)}
	m := NewManager(nil)
	m.engines = map[EngineType]Engine{EngineOpenVPN: e}
	m.retryInterval = time.Millisecond
	m.connectTimeout = 80 * time.Millisecond
	t.Cleanup(func() {
		if err := m.Disconnect(); err != nil {
			t.Error(err)
		}
	})
	return m, e
}
func nextAttempt(t *testing.T, e *scenarioEngine) testAttempt {
	t.Helper()
	select {
	case a := <-e.attempts:
		return a
	case <-time.After(2 * time.Second):
		t.Fatal("backup was not attempted")
		return testAttempt{}
	}
}
func fixtureServers() []vpngate.Server {
	return []vpngate.Server{{HostName: "first", OpenVPNConfigBase64: "first"}, {HostName: "backup", OpenVPNConfigBase64: "backup"}}
}
func waitState(t *testing.T, m *Manager, want State) {
	t.Helper()
	deadline := time.After(2 * time.Second)
	tick := time.NewTicker(time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-tick.C:
			if m.GetConnectionInfo().Status.State == want {
				return
			}
		case <-deadline:
			t.Fatalf("state = %s, want %s", m.GetConnectionInfo().Status.State, want)
		}
	}
}
func TestFailoverAfterAsynchronousError(t *testing.T) {
	m, e := newSupervisorFixture(t)
	if err := m.connectCandidates(fixtureServers(), EngineOpenVPN, false, false); err != nil {
		t.Fatal(err)
	}
	first := nextAttempt(t, e)
	first.status <- Status{State: StateError, Message: "fixture error"}
	backup := nextAttempt(t, e)
	if backup.config != "backup" {
		t.Fatal("wrong backup profile")
	}
	backup.status <- Status{State: StateConnected}
	waitState(t, m, StateConnected)
	// A late event from the first engine must not clear the replacement connection.
	m.mu.Lock()
	current := m.stopMon
	m.mu.Unlock()
	stale := make(chan struct{})
	m.handleStatusUpdate(Status{State: StateError}, stale, false)
	if m.GetConnectionInfo().Status.State != StateConnected || current == nil {
		t.Fatal("stale event changed new connection")
	}
}
func TestFailoverAfterSynchronousError(t *testing.T) {
	m, e := newSupervisorFixture(t)
	e.failFirst = true
	if err := m.connectCandidates(fixtureServers(), EngineOpenVPN, false, false); err != nil {
		t.Fatal(err)
	}
	nextAttempt(t, e)
	backup := nextAttempt(t, e)
	backup.status <- Status{State: StateConnected}
	waitState(t, m, StateConnected)
}
func TestFailoverTimeoutAndCancellation(t *testing.T) {
	m, e := newSupervisorFixture(t)
	if err := m.connectCandidates(fixtureServers(), EngineOpenVPN, false, false); err != nil {
		t.Fatal(err)
	}
	nextAttempt(t, e)
	nextAttempt(t, e) // timeout must start the second server
	if err := m.Disconnect(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-e.attempts:
		t.Fatal("connection restarted after user disconnect")
	case <-time.After(2 * m.connectTimeout):
	}
	if m.GetConnectionInfo().Status.State != StateDisconnected {
		t.Fatal("timeout overwrote user disconnect")
	}
}
func TestKillSwitchRequestRejectedBeforeEngineStarts(t *testing.T) {
	m, e := newSupervisorFixture(t)
	if err := m.ConnectToServer(fixtureServers()[0], EngineOpenVPN, true, false); err == nil {
		t.Fatal("unsupported protection was accepted")
	}
	if e.count.Load() != 0 {
		t.Fatal("engine started despite unavailable protection")
	}
}
func TestDNSFailureDisconnectsWithoutReportingProtection(t *testing.T) {
	m, e := newSupervisorFixture(t)
	m.dnsProtection.snapshot = func() (string, error) { return "", errors.New("fixture snapshot failure") }
	if err := m.ConnectToServer(fixtureServers()[0], EngineOpenVPN, false, true); err != nil {
		t.Fatal(err)
	}
	nextAttempt(t, e).status <- Status{State: StateConnected}
	waitState(t, m, StateError)
	if m.GetConnectionInfo().DNSProtectionOn {
		t.Fatal("failed DNS advertised as enabled")
	}
}

func TestCancelledDiscoveryDoesNotStartEngine(t *testing.T) {
	m, e := newSupervisorFixture(t)
	m.requestID = 1
	if err := m.Disconnect(); err != nil {
		t.Fatal(err)
	}
	if err := m.connectCandidatesFor(fixtureServers(), EngineOpenVPN, false, false, 1); err == nil {
		t.Fatal("server discovery result restarted a cancelled request")
	}
	if e.count.Load() != 0 {
		t.Fatal("cancelled engine was started")
	}
}
