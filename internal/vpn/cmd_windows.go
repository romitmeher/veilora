//go:build windows

package vpn

import (
	"context"
	"fmt"
	"os"
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

// Verify the OS-trusted signature and expected publisher before elevation runs MSI.
func verifyWindowsInstaller(ctx context.Context, path string) error {
	script := `$ErrorActionPreference = 'Stop'; $signature = Get-AuthenticodeSignature -LiteralPath $env:VEILORA_INSTALLER_PATH; if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'OpenVPN') { throw 'Installer signature or publisher is invalid' }`
	cmd := hiddenCommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	cmd.Env = append(os.Environ(), "VEILORA_INSTALLER_PATH="+path)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("verify OpenVPN installer: %w (%s)", err, out)
	}
	return nil
}
