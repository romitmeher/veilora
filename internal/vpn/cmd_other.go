//go:build !windows

package vpn

import (
	"context"
	"errors"
	"os/exec"
)

func prepareCmd(_ *exec.Cmd) {}

func hiddenCommand(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}

func hiddenCommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	return exec.CommandContext(ctx, name, args...)
}

func verifyWindowsInstaller(_ context.Context, _ string) error {
	return errors.New("Windows installer verification requires Windows")
}
