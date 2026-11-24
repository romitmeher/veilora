//go:build windows

package vpn

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

func runSoftEtherProvisionCommand(ctx context.Context, exe string, args ...string) ([]byte, error) {
	cmd := hiddenCommandContext(ctx, exe, args...)
	cmd.Dir = filepath.Dir(exe)
	return cmd.CombinedOutput()
}

func installedSoftEtherService(ctx context.Context) (string, bool) {
	for _, name := range []string{"SEVPNCLIENT", "SEVPNCLIENTDEV"} {
		if out, err := runSoftEtherProvisionCommand(ctx, "sc.exe", "query", name); err == nil && len(out) > 0 {
			return name, true
		}
	}
	return "", false
}

// ProvisionBundledSoftEther prepares the bundled SoftEther client and VPN adapter.
// It uses upstream /install and vpndrvinst service/adapter modes. Elevation must
// be confirmed by the caller before this function is invoked.
func ProvisionBundledSoftEther(ctx context.Context) (SoftEtherOwnership, error) {
	ownership := SoftEtherOwnership{
		Service: softEtherServiceName,
		Adapter: softEtherAdapterName,
		Account: softEtherAccountName,
	}
	if len(embeddedSoftEther()) == 0 {
		return ownership, fmt.Errorf("no bundled SoftEther runtime")
	}
	dir, err := bundledSoftEtherRuntimeDir()
	if err != nil {
		return ownership, err
	}

	client := filepath.Join(dir, "vpnclient.exe")
	nicInstaller := filepath.Join(dir, "vpndrvinst.exe")

	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	serviceName, serviceExisted := installedSoftEtherService(ctx)

	var out []byte
	if !serviceExisted {
		out, err = runSoftEtherProvisionCommand(ctx, client, "/install")
		if err != nil && !strings.Contains(strings.ToLower(string(out)), "already installed") {
			return ownership, fmt.Errorf("install SoftEther service: %w: %s", err, out)
		}
		if foundName, ok := installedSoftEtherService(ctx); ok {
			serviceName = foundName
		} else {
			serviceName = "SEVPNCLIENT"
		}
		ownership.Service = serviceName
	}

	var startErr error
	for attempt := 0; attempt < 5; attempt++ {
		out, startErr = runSoftEtherProvisionCommand(ctx, "sc.exe", "start", serviceName)
		if startErr == nil || strings.Contains(strings.ToLower(string(out)), "already been started") || strings.Contains(strings.ToLower(string(out)), "running") {
			startErr = nil
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if startErr != nil {
		if !serviceExisted {
			_, _ = runSoftEtherProvisionCommand(ctx, client, "/uninstall")
		}
		return ownership, fmt.Errorf("start Veilora SoftEther service: %w: %s", startErr, out)
	}

	waitCtx, cancelWait := context.WithTimeout(ctx, 15*time.Second)
	defer cancelWait()
	ready := false
	for waitCtx.Err() == nil {
		cmd := filepath.Join(dir, "vpncmd.exe")
		out, err = runSoftEtherProvisionCommand(waitCtx, cmd, "/CLIENT", "localhost", "/CMD", "About")
		if err == nil && len(out) > 0 {
			ready = true
			break
		}
		time.Sleep(250 * time.Millisecond)
	}
	if !ready {
		return ownership, fmt.Errorf("SoftEther client service did not become ready")
	}

	cmd := filepath.Join(dir, "vpncmd.exe")
	nicOut, err := runSoftEtherProvisionCommand(ctx, cmd, "/CLIENT", "localhost", "/CMD", "NicList")
	if err != nil {
		return ownership, fmt.Errorf("list SoftEther virtual adapters: %w: %s", err, nicOut)
	}
	createdAdapter := false
	if !softEtherNicListed(nicOut, softEtherAdapterName) {
		out, err = runSoftEtherProvisionCommand(ctx, nicInstaller, "instvlan", softEtherAdapterName)
		if err != nil {
			return ownership, fmt.Errorf("create VPN adapter: %w: %s", err, out)
		}
		createdAdapter = true
	}

	nicOut, err = runSoftEtherProvisionCommand(ctx, cmd, "/CLIENT", "localhost", "/CMD", "NicList")
	if err != nil || !softEtherNicListed(nicOut, softEtherAdapterName) {
		if createdAdapter {
			_, _ = runSoftEtherProvisionCommand(ctx, nicInstaller, "uninstvlan", softEtherAdapterName)
		}
		if !serviceExisted {
			_, _ = runSoftEtherProvisionCommand(ctx, client, "/stop")
			_, _ = runSoftEtherProvisionCommand(ctx, client, "/uninstall")
		}
		return ownership, fmt.Errorf("VPN adapter was not available: %v: %s", err, nicOut)
	}
	return ownership, nil
}

// CleanupBundledSoftEther disconnects and deletes only the VeiloraVPN account.
func CleanupBundledSoftEther(ctx context.Context) error {
	if len(embeddedSoftEther()) == 0 {
		return nil
	}
	dir, err := bundledSoftEtherRuntimeDir()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	cmd := filepath.Join(dir, "vpncmd.exe")
	if _, err := runSoftEtherProvisionCommand(ctx, cmd, "/CLIENT", "localhost", "/CMD",
		"AccountDisconnect", softEtherAccountName); err != nil {
		// The account may already be disconnected.
	}
	if _, err := runSoftEtherProvisionCommand(ctx, cmd, "/CLIENT", "localhost", "/CMD",
		"AccountDelete", softEtherAccountName); err != nil {
		// The account may already be deleted.
	}

	return nil
}
