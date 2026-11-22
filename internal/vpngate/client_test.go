package vpngate

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

const sampleCSV = `*vpn_servers
#HostName,IP,Score,Ping,Speed,CountryLong,CountryShort,NumVpnSessions,Uptime,TotalUsers,TotalTraffic,LogType,Operator,Message,OpenVPN_ConfigData_Base64
vpn100000001.opengw.net,198.51.100.1,12345,15,50000000,Japan,JP,5,1000,20,500000000,2weeks,Volunteer,Welcome,Y2xpZW50CmRldnBwbg==
`

func TestClientFallbackToMirror(t *testing.T) {
	// Primary server fails
	primaryServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "server down", http.StatusInternalServerError)
	}))
	defer primaryServer.Close()

	// Mirror server succeeds
	mirrorServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprint(w, sampleCSV)
	}))
	defer mirrorServer.Close()

	client := NewClient()
	client.SetEndpoints([]string{primaryServer.URL, mirrorServer.URL})

	servers, err := client.GetServers("", false)
	if err != nil {
		t.Fatalf("expected fallback to succeed, got error: %v", err)
	}

	if len(servers) != 1 {
		t.Fatalf("expected 1 server from mirror, got %d", len(servers))
	}

	if servers[0].HostName != "vpn100000001.opengw.net" {
		t.Errorf("expected HostName 'vpn100000001.opengw.net', got %q", servers[0].HostName)
	}
	if servers[0].CountryShort != "JP" {
		t.Errorf("expected CountryShort 'JP', got %q", servers[0].CountryShort)
	}
}

func TestClientAllEndpointsFail(t *testing.T) {
	server1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "down 1", http.StatusBadGateway)
	}))
	defer server1.Close()

	server2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "down 2", http.StatusServiceUnavailable)
	}))
	defer server2.Close()

	client := NewClient()
	client.SetEndpoints([]string{server1.URL, server2.URL})

	_, err := client.GetServers("", false)
	if err == nil {
		t.Fatal("expected error when all endpoints fail")
	}
}
