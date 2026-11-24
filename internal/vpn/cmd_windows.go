//go:build windows

package vpn

import (
	"context"
	"os/exec"
	"syscall"
)

// prepareCmd sets process attributes to prevent console/terminal windows from popping up on Windows.
func prepareCmd(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
}

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
