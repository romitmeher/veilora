package vpn

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

type softEtherProvisionRunner func(context.Context, string, ...string) ([]byte, error)

type SoftEtherOwnership struct {
	Service string `json:"service"`
	Adapter string `json:"adapter"`
	Account string `json:"account"`
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
