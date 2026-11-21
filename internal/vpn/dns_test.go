package vpn

import "testing"

func TestSetResolver(t *testing.T) {
	for _, tc := range []struct {
		name, input, want string
		invalid           bool
	}{
		{"ipv4", "9.9.9.9", "9.9.9.9", false},
		{"ipv6", "2606:4700:4700::1111", "2606:4700:4700::1111", false},
		{"trim", " 9.9.9.9 ", "9.9.9.9", false},
		{"default", "", defaultDNS, false},
		{"hostname", "dns.example.com", defaultDNS, true},
		{"invalid octet", "999.1.1.1", defaultDNS, true},
		{"shell input", "1.1.1.1\"; Write-Output bad; #", defaultDNS, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d := NewDNSProtection()
			err := d.SetResolver(tc.input)
			if (err != nil) != tc.invalid {
				t.Fatalf("error = %v, want invalid = %v", err, tc.invalid)
			}
			if d.GetResolver() != tc.want {
				t.Fatalf("resolver = %q, want %q", d.GetResolver(), tc.want)
			}
		})
	}
}
