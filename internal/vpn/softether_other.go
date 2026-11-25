//go:build !windows

package vpn

import (
	"context"
	"errors"
)

func ProvisionBundledSoftEther(context.Context) (SoftEtherOwnership, error) {
	return SoftEtherOwnership{}, errors.New("bundled SoftEther provisioning is Windows-only")
}

func CleanupBundledSoftEther(context.Context) error {
	return nil
}

func UninstallBundledSoftEther(context.Context) error {
	return nil
}
