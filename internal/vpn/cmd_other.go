//go:build !windows

package vpn

import (
	"context"
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
