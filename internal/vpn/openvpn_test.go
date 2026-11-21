package vpn

import (
	"bufio"
	"io"
	"net"
	"testing"
	"time"
)

func TestManagementSubscribesBeforeStartingTunnel(t *testing.T) {
	client, server := net.Pipe() // In-memory connection; no TCP port or VPN process.
	defer client.Close()
	defer server.Close()
	if err := client.SetDeadline(time.Now().Add(2 * time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := server.SetDeadline(time.Now().Add(2 * time.Second)); err != nil {
		t.Fatal(err)
	}
	result := make(chan error, 1)
	go func() { result <- startManagement(client) }()
	r := bufio.NewReader(server)
	for _, want := range []string{"state on\n", "hold release\n"} {
		got, err := r.ReadString('\n')
		if err != nil || got != want {
			t.Fatalf("management command = %q, err=%v; want %q", got, err, want)
		}
	}
	if err := <-result; err != nil {
		t.Fatal(err)
	}
	statuses := make(chan Status, 1)
	done := make(chan struct{})
	defer close(done)
	go NewOpenVPNEngine().monitorManagement(client, statuses, done)
	if _, err := io.WriteString(server, ">STATE:123,CONNECTED,SUCCESS,10.0.0.2,192.0.2.1\n"); err != nil {
		t.Fatal(err)
	}
	select {
	case status := <-statuses:
		if status.State != StateConnected {
			t.Fatalf("state = %q, want connected", status.State)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("CONNECTED event was not delivered")
	}
}

func TestManagementRejectsClosedConnection(t *testing.T) {
	client, server := net.Pipe()
	client.Close()
	server.Close()
	if err := startManagement(client); err == nil {
		t.Fatal("expected error for closed management connection")
	}
}
