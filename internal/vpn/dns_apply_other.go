//go:build !windows

package vpn

func applySystemDNS(resolver, _ string) error {
	return setSystemDNS(resolver)
}
