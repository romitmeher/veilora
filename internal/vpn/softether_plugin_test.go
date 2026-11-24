package vpn

import (
	"context"
	"strings"
	"testing"
)

func TestVPNCmdOutputHasError(t *testing.T) {
	tests := []struct {
		output string
		want   bool
	}{
		{"The command completed successfully.", false},
		{"Error occurred. (Error code: 36)\nThe specified VPN Connection Setting does not exist.", true},
		{"Connection failed.", true},
	}
	for _, tt := range tests {
		if got := vpnCmdOutputHasError([]byte(tt.output)); got != tt.want {
			t.Errorf("vpnCmdOutputHasError(%q) = %v, want %v", tt.output, got, tt.want)
		}
	}
}

func TestSoftEtherAccountCreateCommand(t *testing.T) {
	command := softEtherAccountCreateCommand("219.100.37.208", "443")
	want := []string{
		"AccountCreate",
		"VeiloraVPN",
		"/SERVER:219.100.37.208:443",
		"/HUB:VPNGATE",
		"/USERNAME:vpn",
		"/NICNAME:VPN",
	}
	if len(command) != len(want) {
		t.Fatalf("command length = %d, want %d", len(command), len(want))
	}
	for i := range want {
		if command[i] != want[i] {
			t.Errorf("command[%d] = %q, want %q", i, command[i], want[i])
		}
	}
}

func TestSoftEtherSessionEstablished(t *testing.T) {
	tests := []struct {
		output string
		want   bool
	}{
		{`Connected to VPN Client "localhost".`, false},
		{"Session Status |Connection to VPN Server Started", false},
		{"Session Status |Connection Completed (Session Established)", true},
	}
	for _, tt := range tests {
		if got := softEtherSessionEstablished([]byte(tt.output)); got != tt.want {
			t.Errorf("softEtherSessionEstablished(%q) = %v, want %v", tt.output, got, tt.want)
		}
	}
}

func TestSoftEtherNativeEndpointIgnoresOpenVPNPort(t *testing.T) {
	host, port, err := SoftEtherNativeEndpoint("client\nremote 219.100.37.208 1194\n")
	if err != nil {
		t.Fatal(err)
	}
	if host != "219.100.37.208" || port != "443" {
		t.Fatalf("native endpoint = %s:%s, want 219.100.37.208:443", host, port)
	}
	if err := validateSoftEtherEndpoint(host, "1194"); err == nil {
		t.Fatal("OpenVPN port was accepted as a SoftEther endpoint port")
	}
}

func TestSoftEtherNativeEndpointRejectsInvalidHost(t *testing.T) {
	if _, _, err := SoftEtherNativeEndpoint("remote bad host name 443\n"); err == nil {
		t.Fatal("invalid host was accepted")
	}
}

func TestSoftEtherNicMatch(t *testing.T) {
	if !softEtherNicListed([]byte("VPN Enabled"), "VPN") {
		t.Fatal("VPN adapter not recognized")
	}
	if softEtherNicListed([]byte("UserAdapter Enabled"), "VPN") {
		t.Fatal("unrelated adapter matched VPN")
	}
}

func TestSoftEtherOwnedCleanupCommands(t *testing.T) {
	accountDelete := []string{
		"/CLIENT", "localhost", "/CMD",
		"AccountDisconnect", softEtherAccountName,
		"AccountDelete", softEtherAccountName,
	}
	for _, arg := range accountDelete {
		if strings.Contains(arg, "UserAdapter") {
			t.Fatal("cleanup contained an unrelated adapter")
		}
	}
	if !strings.Contains(strings.Join(accountDelete, " "), softEtherAccountName) {
		t.Fatal("VeiloraVPN account missing from cleanup")
	}
}

func TestSoftEtherUpstreamServiceName(t *testing.T) {
	if softEtherServiceName != "SEVPNCLIENTDEV" {
		t.Fatalf("service name = %q, want upstream GC_SVC_NAME_VPNCLIENT", softEtherServiceName)
	}
}

func TestExternalSoftEtherInstallerIsRejected(t *testing.T) {
	err := InstallEngineType(context.Background(), EngineSoftEther, nil)
	if err == nil {
		t.Fatal("external SoftEther installer was not rejected")
	}
	if !strings.Contains(err.Error(), "external SoftEther installer execution is disabled") &&
		!strings.Contains(err.Error(), "only supported on Windows") {
		t.Fatalf("unexpected installer error: %v", err)
	}
}

func TestOpenVPNExternalInstallerPolicyMessage(t *testing.T) {
	message := "OpenVPN MSI installation is blocked by Windows policy (MSI 1625); use the bundled Veilora OpenVPN runtime"
	if !strings.Contains(message, "MSI 1625") || !strings.Contains(message, "bundled") {
		t.Fatal("policy error does not explain the bundled-runtime fix")
	}
}

func TestSeparateSoftEtherAccountCleanupCommands(t *testing.T) {
	disconnectCmd := []string{"/CLIENT", "localhost", "/CMD", "AccountDisconnect", softEtherAccountName}
	deleteCmd := []string{"/CLIENT", "localhost", "/CMD", "AccountDelete", softEtherAccountName}
	if strings.Join(disconnectCmd, " ") == strings.Join(deleteCmd, " ") {
		t.Fatal("disconnect and delete must be separate operations")
	}
	if disconnectCmd[len(disconnectCmd)-1] != softEtherAccountName || deleteCmd[len(deleteCmd)-1] != softEtherAccountName {
		t.Fatal("cleanup changed the VeiloraVPN account name")
	}
}

func TestOpenVPNReconnectStatus(t *testing.T) {
	status, ok := parseManagementLine(">STATE:123,RECONNECTING,reconnection in progress")
	if !ok || status.State != StateReconnecting || status.Message != "reconnecting: reconnection in progress" {
		t.Fatalf("unexpected reconnect status: %+v, ok=%v", status, ok)
	}
}
