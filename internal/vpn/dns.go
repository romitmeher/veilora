package vpn

import (
	"fmt"
	"log"
	"net"
	"strings"
)

const defaultDNS = "1.1.1.1" // Cloudflare DNS (privacy-focused, routes through VPN tunnel)

// DNSProtection overrides system DNS when the VPN is connected.
type DNSProtection struct {
	enabled  bool
	resolver string
	prevDNS  string
}

func NewDNSProtection() *DNSProtection {
	return &DNSProtection{
		resolver: defaultDNS,
	}
}

// SetResolver sets the DNS resolver address to use when protection is active.
func (d *DNSProtection) SetResolver(addr string) error {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		addr = defaultDNS
	}
	if net.ParseIP(addr) == nil {
		return fmt.Errorf("DNS resolver must be an IPv4 or IPv6 address")
	}
	d.resolver = addr
	return nil
}

// GetResolver returns the current DNS resolver address.
func (d *DNSProtection) GetResolver() string {
	return d.resolver
}

// Enable overrides the system DNS to route queries through the VPN.
func (d *DNSProtection) Enable() error {
	if d.enabled {
		return nil
	}
	prev, err := getSystemDNS()
	if err != nil {
		log.Printf("dns: could not read current DNS (will not restore on disable): %v", err)
	}
	d.prevDNS = prev

	if err := setSystemDNS(d.resolver); err != nil {
		return fmt.Errorf("dns: set system DNS to %s: %w", d.resolver, err)
	}
	d.enabled = true
	log.Printf("dns: protection enabled (resolver: %s)", d.resolver)
	return nil
}

// Disable restores the original system DNS settings.
func (d *DNSProtection) Disable() error {
	if !d.enabled {
		return nil
	}
	if err := restoreSystemDNS(d.prevDNS); err != nil {
		return fmt.Errorf("dns: restore system DNS: %w", err)
	}
	d.enabled = false
	d.prevDNS = ""
	log.Println("dns: protection disabled")
	return nil
}

func (d *DNSProtection) IsEnabled() bool {
	return d.enabled
}
