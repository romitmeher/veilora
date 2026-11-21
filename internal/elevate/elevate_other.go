//go:build !windows

package elevate

// IsElevated returns true on non-Windows platforms.
func IsElevated() bool {
	return true
}

// RelaunchElevated is a no-op on non-Windows platforms.
func RelaunchElevated() error {
	return nil
}
