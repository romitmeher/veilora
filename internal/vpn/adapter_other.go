//go:build !windows

package vpn

func prepareBundledAdapter(string) (string, func() error, error) { return "", nil, nil }
