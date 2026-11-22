//go:build !windows

package vpn

func enableSoftEtherRouting() (string, error) {
	return "", nil
}

func restoreSoftEtherRouting(string) error {
	return nil
}
