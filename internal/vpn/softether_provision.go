package vpn

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

type SoftEtherOwnership struct {
	Service           string `json:"service"`
	ServiceOwned      bool   `json:"serviceOwned"`
	ServiceBinaryPath string `json:"serviceBinaryPath,omitempty"`
	Adapter           string `json:"adapter"`
	AdapterOwned      bool   `json:"adapterOwned"`
	Account           string `json:"account"`
	RuntimeDir        string `json:"runtimeDir,omitempty"`
	ManifestHash      string `json:"manifestHash,omitempty"`
	UpdatedAt         string `json:"updatedAt,omitempty"`
}

var safeSoftEtherHost = regexp.MustCompile(`^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$`)

// SoftEtherNativeEndpoint deliberately ignores the OpenVPN remote port.
// VPNGate native SoftEther VPNGate endpoints use the public SSL-VPN endpoint 443.
func SoftEtherNativeEndpoint(openVPNConfig string) (host string, port string, err error) {
	for _, line := range strings.Split(openVPNConfig, "\n") {
		fields := strings.Fields(strings.TrimSpace(line))
		if len(fields) >= 2 && fields[0] == "remote" {
			if len(fields) > 3 {
				continue
			}
			host = strings.TrimSpace(fields[1])
			if len(host) > 253 || !safeSoftEtherHost.MatchString(host) {
				return "", "", fmt.Errorf("invalid SoftEther endpoint host")
			}
			return host, softEtherNativePort, nil
		}
	}
	return "", "", fmt.Errorf("no OpenVPN remote host found")
}

//nolint:unparam // name is parameterized for test coverage
func softEtherNicListed(output []byte, name string) bool {
	for _, line := range strings.Split(strings.ToLower(string(output)), "\n") {
		fields := strings.Fields(strings.Trim(line, "| \t"))
		if len(fields) > 0 && strings.Trim(fields[0], "| ") == strings.ToLower(name) {
			return true
		}
	}
	return strings.Contains(strings.ToLower(string(output)), "device name: "+strings.ToLower(name))
}

func validateSoftEtherEndpoint(host, port string) error {
	if !safeSoftEtherHost.MatchString(host) {
		return fmt.Errorf("invalid SoftEther endpoint host")
	}
	if port != softEtherNativePort {
		return fmt.Errorf("unsupported SoftEther endpoint port %q; native VPNGate support requires port 443", port)
	}
	return nil
}

// probeSoftEtherEndpoint verifies that the target server accepts TLS connections
// on TCP 443 before attempting SoftEther provisioning or vpncmd connection.
func probeSoftEtherEndpoint(ctx context.Context, host, port string) error {
	if err := validateSoftEtherEndpoint(host, port); err != nil {
		return err
	}
	dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	conn, err := dialer.DialContext(dialCtx, "tcp", net.JoinHostPort(host, port))
	if err != nil {
		return fmt.Errorf("SoftEther SSL-VPN endpoint %s:%s is unreachable: %w", host, port, err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	// SoftEther native SSL-VPN serves TLS on TCP 443 (often with self-signed server certs).
	tlsConn := tls.Client(conn, &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: true, // #nosec G402 -- pre-flight reachability probe only; SoftEther vpncmd handles session auth.
	})
	if err := tlsConn.HandshakeContext(dialCtx); err != nil {
		return fmt.Errorf("server %s:%s did not respond as a TLS/SSL-VPN endpoint: %w", host, port, err)
	}
	_ = tlsConn.Close()
	return nil
}
