package vpn

import (
	"errors"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
)

const defaultDNS = "1.1.1.1" // Default custom resolver; routing is controlled by the VPN.

// DNSProtection overrides system DNS when the VPN is connected.
type DNSProtection struct {
	mu       sync.Mutex
	snapshot func() (string, error)
	apply    func(string, string) error
	restore  func(string) error
	enabled  bool
	resolver string
	prevDNS  string
}

func NewDNSProtection() *DNSProtection {
	return &DNSProtection{
		resolver: defaultDNS,
		snapshot: getSystemDNS, apply: applySystemDNS, restore: restoreSystemDNS,
	}
}

// SetResolver sets the DNS resolver address to use when protection is active.
func (d *DNSProtection) SetResolver(addr string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.enabled {
		return errors.New("disconnect before changing DNS resolver")
	}
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
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.resolver
}

// Enable applies a custom resolver. It does not enforce DNS traffic routing.
func (d *DNSProtection) Enable() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.enabled {
		return nil
	}
	prev, err := d.snapshot()
	if err != nil {
		return fmt.Errorf("dns: cannot snapshot current settings: %w", err)
	}
	d.prevDNS = prev

	if err := d.apply(d.resolver, prev); err != nil {
		rollbackErr := d.restore(prev)
		if rollbackErr != nil {
			d.enabled = true
		} else {
			d.prevDNS = ""
		}
		return errors.Join(fmt.Errorf("dns: apply resolver: %w", err), rollbackErr)
	}
	d.enabled = true
	log.Printf("dns: protection enabled (resolver: %s)", d.resolver)
	return nil
}

// Disable restores the original system DNS settings.
func (d *DNSProtection) Disable() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if !d.enabled {
		return nil
	}
	if err := d.restore(d.prevDNS); err != nil {
		return fmt.Errorf("dns: restore system DNS: %w", err)
	}
	d.enabled = false
	d.prevDNS = ""
	log.Println("dns: protection disabled")
	return nil
}

func (d *DNSProtection) IsEnabled() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.enabled
}
