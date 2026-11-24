//go:build !windows

package vpn

import (
	"os/exec"
)

func prepareCmd(_ *exec.Cmd) {}

func hiddenCommand(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	prepareCmd(cmd)
	return cmd
}
