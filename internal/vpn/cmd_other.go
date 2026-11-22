//go:build !windows

package vpn

import (
	"context"
	"errors"
	"os/exec"
)

func prepareCmd(_ *exec.Cmd) {}

func hiddenCommand(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	prepareCmd(cmd)
	return cmd
}

func hiddenCommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	prepareCmd(cmd)
	return cmd
}

func verifyWindowsInstaller(_ context.Context, _ string) error {
	return errors.New("windows installer verification requires Windows")
}
