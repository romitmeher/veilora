# Bundled Windows VPN runtime

Windows production builds compile the pinned OpenVPN v2.7.9 source and embed
the resulting daemon, runtime DLLs, tapctl,
and the signed TAP-Windows 9.27.0 driver. Users do not need an existing OpenVPN
or SoftEther installation. SoftEther is an optional external engine.

On connection, Veilora extracts its embedded runtime into a private temporary
directory, stages the signed driver using Windows PnPUtil, and creates its own
adapter using tapctl. It removes its adapter on disconnect. The shared signed
driver remains in the Windows driver store. This requires administrator rights.
No OpenVPN GUI, service, MSI installer, or SoftEther service is installed.
An internet connection is still required for server discovery and VPN use.
WebView2 remains a Windows UI prerequisite; the Veilora installer includes its
existing bootstrapper. Standalone here means no separately installed VPN client.

## Build

Windows with Visual Studio 2022 C++ Build Tools, CMake, Python 3, Go, Node and Wails:

```powershell
git submodule update --init --recursive
powershell -NoProfile -File scripts/build-vpn-source.ps1 -Arch amd64
wails build -skipbindings -tags bundledvpn
```

Use `-Arch arm64` and Wails `-platform windows/arm64` for ARM64. Windows
`task build:prod` and `task build:prod-noupdate` prepare and embed the matching
payload automatically. Plain development builds retain external engine discovery.
The `bundledvpn` build fails if its architecture's payload is absent.

The native build uses OpenVPN's own CMake preset and pinned vcpkg source.
The daemon and tapctl are compiled from source, not extracted from an installer.
Only the hash-pinned signed TAP driver is downloaded prebuilt, because changing
a kernel driver invalidates its signature. No driver installation runs during builds. Payloads are generated
build artifacts, not checked into Git. Runtime extraction checks the architecture,
file hashes, file sizes, and paths before returning an executable path.

## Upstream notices and source

The daemon uses unmodified upstream code as a separate subprocess. Bundling does not change the
licenses of upstream components. The payload preserves upstream license documents.

- OpenVPN (GPL-2.0): https://github.com/OpenVPN/openvpn/tree/v2.7.9
  Source: https://swupdate.openvpn.org/community/releases/openvpn-2.7.9.tar.gz
- Windows packaging and dependency build recipes:
  https://github.com/OpenVPN/openvpn-build
- TAP-Windows (GPL-2.0): https://github.com/OpenVPN/tap-windows6/tree/9.27.0
- OpenSSL, PKCS#11 helper, and Microsoft runtime DLLs retain their upstream terms.
  Consult the included OpenVPN license file for dependency notices.

The build also prepares `build/bin/Veilora-vpn-sources.zip` with OpenVPN, TAP,
LZO, LZ4, OpenSSL, PKCS#11 helper, and the matching OpenVPN/vcpkg build recipes
and patches. Both Windows release workflows publish this alongside the binaries.
Keep that source archive available with redistributed releases. The repository's
MIT license does not replace these third-party licenses.

## Validation limits

Headless checks cover extraction, architecture/integrity failures, engine selection,
and simulated adapter setup/cleanup. Real driver installation and VPN connectivity
must be tested on a clean isolated Windows machine; they are not tested on the
developer's desktop. The kill switch remains unavailable. Mobile remains a demo.

## Upstream checkouts

- `third_party/openvpn`: OpenVPN v2.7.9, the default bundled connection engine.
- `third_party/softether`: SoftEther 5.2.5190 and its recursive source dependencies.
- `third_party/vcpkg`: pinned native dependencies matching the upstream build recipes.

These are Git submodules, so Veilora reuses upstream implementation and preserves
its history and licenses. The application UI and Go backend remain the existing
Veilora project. No new VPN protocol implementation is being written.

`build-vpn-source.ps1 -Engine softether -Arch amd64` provides an optional upstream
SoftEther client/tool build and writes a separate
`windows-amd64-softether.zip` payload. It contains `vpnclient.exe`, `vpncmd.exe`,
`vpndrvinst.exe`, `hamcore.se2`, and upstream notices. The payload is extracted
and hash-checked independently from the OpenVPN payload. A bundled build does not
claim SoftEther is ready until the private runtime validates and the Windows
service and Neo6 adapter lifecycle is provisioned successfully.

The source-build path has not yet been executed in this workspace because the
Visual Studio C++ toolchain is absent. Earlier embedded-payload tests used official
prebuilt binaries and do not validate the replacement native source build. Use the
Windows CI build for native compilation before distributing a source-built release.

The bundled SoftEther package now has separate archive, manifest, and runtime
extraction support. This workspace has not executed a SoftEther CMake build or
verified its signed Neo6 adapter package, `SEVPNCLIENTDEV` service lifecycle,
UAC/rollback behavior, or live VPN session. Those remain Windows-native validation
requirements.

Veilora exposes engine readiness separately from connection status. A ready
engine must have validated binaries/payload and completed its required Windows
provisioning. Reporting ready is not a claim that a tunnel is connected.
