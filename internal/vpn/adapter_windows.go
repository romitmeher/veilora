//go:build windows

package vpn

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/sys/windows"
)

type adapterCommand func(string, ...string) ([]byte, error)

func prepareBundledAdapter(dir string) (string, func() error, error) {
	systemDir, err := windows.GetSystemDirectory()
	if err != nil {
		return "", nil, err
	}
	return createBundledAdapter(dir, filepath.Join(systemDir, "pnputil.exe"), func(exe string, args ...string) ([]byte, error) {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		return hiddenCommandContext(ctx, exe, args...).CombinedOutput()
	})
}

// The runner is injectable so tests never touch the driver store or adapters.
func createBundledAdapter(dir, pnputil string, run adapterCommand) (string, func() error, error) {
	if out, err := run(pnputil, "/add-driver", filepath.Join(dir, "OemVista.inf")); err != nil {
		return "", nil, fmt.Errorf("prepare bundled VPN driver (administrator rights required): %w: %s", err, out)
	}
	tapctl := filepath.Join(dir, "tapctl.exe")
	out, err := run(tapctl, "create", "--hwid", `root\tap0901`, "--name", filepath.Base(dir))
	if err != nil {
		return "", nil, fmt.Errorf("create Veilora adapter: %w: %s", err, out)
	}
	// tapctl 2.7 prints GUID, name, HWID separated by tabs; older builds print GUID.
	fields := strings.Fields(string(out))
	if len(fields) == 0 || !adapterGUID.MatchString(fields[0]) {
		return "", nil, fmt.Errorf("invalid adapter identity returned by tapctl: %s", out)
	}
	id := fields[0]
	cleanup := func() error {
		if out, err := run(tapctl, "delete", id); err != nil {
			return fmt.Errorf("remove OpenVPN adapter: %w: %s", err, out)
		}
		return nil
	}
	return id, cleanup, nil
}
