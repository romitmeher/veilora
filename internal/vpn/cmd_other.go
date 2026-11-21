//go:build !windows

package vpn

import (
	"context"
	"os/exec"
)

func prepareCmd(cmd *exec.Cmd) {}

func hiddenCommand(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}

func hiddenCommandContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	return exec.CommandContext(ctx, name, args...)
}
