//go:build windows

package vpn

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func runSoftEtherProvisionCommand(ctx context.Context, exe string, args ...string) ([]byte, error) {
	cmd := hiddenCommandContext(ctx, exe, args...)
	if filepath.IsAbs(exe) {
		cmd.Dir = filepath.Dir(exe)
	}
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

func restrictSoftEtherRuntimeACL(ctx context.Context, dir string) error {
	// Well-known SIDs: SYSTEM (S-1-5-18), Administrators (S-1-5-32-544), Users (S-1-5-32-545).
	out, err := runSoftEtherProvisionCommand(ctx, "icacls.exe", dir,
		"/inheritance:r",
		"/grant:r", "*S-1-5-18:(OI)(CI)F",
		"/grant:r", "*S-1-5-32-544:(OI)(CI)F",
		"/grant:r", "*S-1-5-32-545:(OI)(CI)RX",
	)
	if err != nil {
		return fmt.Errorf("restrict SoftEther runtime ACL: %w: %s", err, out)
	}
	return nil
}

// ProvisionBundledSoftEther prepares the bundled SoftEther client and VPN adapter
// in a persistent, ACL-restricted ProgramData directory and records component ownership.
// Elevation must be confirmed by the caller before this function is invoked.
func ProvisionBundledSoftEther(ctx context.Context) (SoftEtherOwnership, error) {
	runtimeDir := defaultSoftEtherRuntimeDir()
	ownershipPath := defaultSoftEtherOwnershipPath()
	ownership := SoftEtherOwnership{
		Service:    softEtherServiceName,
		Adapter:    softEtherAdapterName,
		Account:    softEtherAccountName,
		RuntimeDir: runtimeDir,
	}
	if len(embeddedSoftEther()) == 0 {
		return ownership, fmt.Errorf("no bundled SoftEther runtime")
	}

	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	manifestHash, err := installPersistentSoftEtherRuntime(runtimeDir)
	if err != nil {
		return ownership, err
	}
	ownership.ManifestHash = manifestHash
	if err := restrictSoftEtherRuntimeACL(ctx, runtimeDir); err != nil {
		return ownership, err
	}

	client := filepath.Join(runtimeDir, "vpnclient.exe")
	nicInstaller := filepath.Join(runtimeDir, "vpndrvinst.exe")
	vpncmd := filepath.Join(runtimeDir, "vpncmd.exe")

	prevOwnership, prevErr := loadSoftEtherOwnership(ownershipPath)
	serviceName, serviceExisted := installedSoftEtherService(ctx)

	serviceCreatedNow := false
	adapterCreatedNow := false
	committed := false

	defer func() {
		if committed {
			return
		}
		rollbackCtx, rollbackCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer rollbackCancel()
		if adapterCreatedNow {
			_, _ = runSoftEtherProvisionCommand(rollbackCtx, nicInstaller, "uninstvlan", ownership.Adapter)
		}
		if serviceCreatedNow {
			_, _ = runSoftEtherProvisionCommand(rollbackCtx, "sc.exe", "stop", ownership.Service)
			_, _ = runSoftEtherProvisionCommand(rollbackCtx, client, "/uninstall")
			_, _ = runSoftEtherProvisionCommand(rollbackCtx, "sc.exe", "delete", ownership.Service)
			_ = os.RemoveAll(runtimeDir)
			_ = removeSoftEtherOwnership(ownershipPath)
		}
	}()

	if !serviceExisted {
		out, installErr := runSoftEtherProvisionCommand(ctx, client, "/install")
		if installErr != nil && !strings.Contains(strings.ToLower(string(out)), "already installed") {
			return ownership, fmt.Errorf("install SoftEther service: %w: %s", installErr, out)
		}
		if foundName, ok := installedSoftEtherService(ctx); ok {
			serviceName = foundName
		} else {
			serviceName = softEtherServiceName
		}
		serviceCreatedNow = true
		ownership.Service = serviceName
		ownership.ServiceOwned = true
		ownership.ServiceBinaryPath = client
	} else {
		ownership.Service = serviceName
		qcOut, qcErr := runSoftEtherProvisionCommand(ctx, "sc.exe", "qc", serviceName)
		if qcErr == nil {
			actualPath := parseSCQCImagePath(qcOut)
			switch {
			case prevErr == nil && verifyOwnedService(prevOwnership, qcOut):
				ownership.ServiceOwned = true
				ownership.ServiceBinaryPath = prevOwnership.ServiceBinaryPath
			case actualPath != "" && strings.EqualFold(filepath.Clean(actualPath), filepath.Clean(client)):
				ownership.ServiceOwned = true
				ownership.ServiceBinaryPath = client
			default:
				// Pre-existing third-party SoftEther installation: never modify or claim ownership.
				ownership.ServiceOwned = false
				ownership.ServiceBinaryPath = actualPath
			}
		}
	}

	var startOut []byte
	var startErr error
	for attempt := 0; attempt < 5; attempt++ {
		startOut, startErr = runSoftEtherProvisionCommand(ctx, "sc.exe", "start", ownership.Service)
		if startErr == nil || strings.Contains(strings.ToLower(string(startOut)), "already been started") || strings.Contains(strings.ToLower(string(startOut)), "running") {
			startErr = nil
			break
		}
		select {
		case <-ctx.Done():
			return ownership, ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
	if startErr != nil {
		return ownership, fmt.Errorf("start Veilora SoftEther service: %w: %s", startErr, startOut)
	}

	waitCtx, cancelWait := context.WithTimeout(ctx, 15*time.Second)
	defer cancelWait()
	ready := false
	for waitCtx.Err() == nil {
		out, checkErr := runSoftEtherProvisionCommand(waitCtx, vpncmd, "/CLIENT", "localhost", "/CMD", "About")
		if checkErr == nil && len(out) > 0 {
			ready = true
			break
		}
		select {
		case <-waitCtx.Done():
		case <-time.After(250 * time.Millisecond):
		}
	}
	if !ready {
		return ownership, fmt.Errorf("SoftEther client service did not become ready")
	}

	nicOut, err := runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "NicList")
	if err != nil {
		return ownership, fmt.Errorf("list SoftEther virtual adapters: %w: %s", err, nicOut)
	}
	if !softEtherNicListed(nicOut, ownership.Adapter) {
		out, instErr := runSoftEtherProvisionCommand(ctx, nicInstaller, "instvlan", ownership.Adapter)
		if instErr != nil {
			return ownership, fmt.Errorf("create VPN adapter: %w: %s", instErr, out)
		}
		adapterCreatedNow = true
		ownership.AdapterOwned = true
	} else if prevErr == nil && prevOwnership.Adapter == ownership.Adapter {
		ownership.AdapterOwned = prevOwnership.AdapterOwned
	}

	nicOut, err = runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "NicList")
	if err != nil || !softEtherNicListed(nicOut, ownership.Adapter) {
		return ownership, fmt.Errorf("VPN adapter was not available: %v: %s", err, nicOut)
	}

	if err := saveSoftEtherOwnership(ownershipPath, ownership); err != nil {
		return ownership, fmt.Errorf("persist SoftEther ownership: %w", err)
	}
	committed = true
	return ownership, nil
}

// CleanupBundledSoftEther disconnects and deletes only the VeiloraVPN account.
func CleanupBundledSoftEther(ctx context.Context) error {
	if len(embeddedSoftEther()) == 0 {
		return nil
	}
	own, err := loadSoftEtherOwnership(defaultSoftEtherOwnershipPath())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	vpncmd := filepath.Join(own.RuntimeDir, "vpncmd.exe")
	if !isExecutableFile(vpncmd) {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	account := own.Account
	if account == "" {
		account = softEtherAccountName
	}
	_, _ = runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "AccountDisconnect", account)
	_, _ = runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "AccountDelete", account)
	return nil
}

// UninstallBundledSoftEther removes only Veilora-owned SoftEther components
// verified against the persisted ownership record and Windows SCM binary path.
func UninstallBundledSoftEther(ctx context.Context) error {
	ownershipPath := defaultSoftEtherOwnershipPath()
	own, err := loadSoftEtherOwnership(ownershipPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	vpncmd := filepath.Join(own.RuntimeDir, "vpncmd.exe")
	if isExecutableFile(vpncmd) {
		account := own.Account
		if account == "" {
			account = softEtherAccountName
		}
		_, _ = runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "AccountDisconnect", account)
		_, _ = runSoftEtherProvisionCommand(ctx, vpncmd, "/CLIENT", "localhost", "/CMD", "AccountDelete", account)

		if own.AdapterOwned && own.Adapter != "" {
			nicInstaller := filepath.Join(own.RuntimeDir, "vpndrvinst.exe")
			if isExecutableFile(nicInstaller) {
				_, _ = runSoftEtherProvisionCommand(ctx, nicInstaller, "uninstvlan", own.Adapter)
			}
		}
	}

	if own.ServiceOwned && own.Service != "" {
		if qcOut, qcErr := runSoftEtherProvisionCommand(ctx, "sc.exe", "qc", own.Service); qcErr == nil && verifyOwnedService(own, qcOut) {
			_, _ = runSoftEtherProvisionCommand(ctx, "sc.exe", "stop", own.Service)
			client := filepath.Join(own.RuntimeDir, "vpnclient.exe")
			if isExecutableFile(client) {
				_, _ = runSoftEtherProvisionCommand(ctx, client, "/uninstall")
			}
			_, _ = runSoftEtherProvisionCommand(ctx, "sc.exe", "delete", own.Service)
		}
	}

	if own.ServiceOwned && own.RuntimeDir != "" && strings.EqualFold(filepath.Clean(own.RuntimeDir), filepath.Clean(defaultSoftEtherRuntimeDir())) {
		_ = os.RemoveAll(own.RuntimeDir)
	}
	return removeSoftEtherOwnership(ownershipPath)
}
