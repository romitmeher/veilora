# Dual VPN engine audit

## Current OpenVPN integration

- Windows AMD64 and ARM64 production builds embed a verified OpenVPN zip via the `bundledvpn` build tag.
- The zip is extracted to a private temporary directory and validates architecture, required files, archive paths, size limits, and SHA-256 hashes.
- OpenVPN creates and owns a TAP adapter through `tapctl`, stages the signed TAP-Windows 9.27.0 driver, and cleans up only its adapter.
- Native source builds require Visual Studio/CMake; the current documentation and CI preserve OpenVPN licensing and source archives.

## Current SoftEther gap

- `SoftEtherEngine` supports upstream `vpnclient.exe`/`vpncmd.exe` discovery and a separate bundled AMD64 payload.
- Bundled builds no longer download or execute a third-party VPNGate setup wizard.
- The existing lifecycle installs the persistent runtime to `%ProgramData%\Veilora\softether`, tracks ownership in `%ProgramData%\Veilora\softether-ownership.json`, probes TCP/TLS 443 before connecting, creates an account named `VeiloraVPN`, uses `NicName: VPN`, and applies route priority to the owned adapter.
- Clean service/adapter lifecycle, signed Neo6 installation, and live VPN connectivity still require clean-Windows AMD64 VM validation.

## Safe packaging direction

- Keep OpenVPN and SoftEther payloads separate.
- Build and package a SoftEther payload only on Windows AMD64 first.
- Required payload contents: source-built `vpnclient.exe`, `vpncmd.exe`, `hamcore.se2`, upstream licenses/notices, pinned commit metadata, architecture and SHA-256 manifest.
- Prepare the bundled `SEVPNCLIENTDEV` service and virtual adapter only after elevation; preserve unrelated SoftEther installations and settings.
- Do not use the VPNGate plugin installer in bundled builds.

## Restrictions

- Rebuilding or distributing a kernel adapter driver can invalidate signing. Use only signed redistributable upstream components or an explicitly signed build artifact.
- A managed Windows service and TAP/SoftEther virtual adapter require administrator approval and clean rollback.
- Credentials must remain out of process arguments and logs.
- The final installer must preserve OpenVPN cleanup and DNS restoration while integrating bundled SoftEther components.

## SoftEther provisioning implementation

- The app requests elevation before shared Windows service or adapter setup operations.
- The upstream client service name is `SEVPNCLIENTDEV`, as defined by `GC_SVC_NAME_VPNCLIENT`.
- Provisioning uses the source-built `vpnclient.exe /install`, `/start`, `vpndrvinst.exe instvlan`,
  and `vpncmd NicCreate`/`NicList` interfaces.
- Native VPNGate accounts use `softEtherAccountName = VeiloraVPN`, `NicName = VPN`, hub `VPNGATE`,
  username `vpn`, and TCP 443 rather than an OpenVPN profile port.
- Cleanup disconnects/deletes only `VeiloraVPN` account data;
  it does not enumerate or remove unrelated SoftEther services/adapters.

## Native validation remaining

- Windows AMD64 cross-compilation passed, but this workspace did not execute the native service,
  Neo6 adapter, UAC, live account connection, or disconnect flows.
- A clean Windows VM is required to verify `SEVPNCLIENTDEV`, signed Neo6 installation, routing,
  DNS behavior, and end-to-end VPN status. No live connection success is claimed.

## Integration status

- The Go manager, Wails bindings, and React UI now report two engines independently and reject
  silent protocol switching.
- The Windows build tasks and workflows require separate OpenVPN and AMD64 SoftEther payloads.
- The installer can include those payloads, but native service/driver provisioning and clean-install
  behavior remain unverified until the Windows native build is executed on a clean machine.
