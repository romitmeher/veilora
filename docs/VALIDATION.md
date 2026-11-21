# Veilora validation — 2026-11-21

## Passed

- Desktop `npm run build`: TypeScript and Vite production build.
- Desktop `npm run lint`: zero errors, five existing React effect-dependency warnings.
- Go 1.26.1 `go test ./...`: all existing tests passed. Race mode was not run; no GCC toolchain was available.
- Wails v2.11.0 `build -skipbindings`: produced `build/bin/Veilora.exe` for Windows amd64.
- Native Windows launch: verified the Veilora window title, V mark, welcome screen, main navigation, and VPN controls; latest grayscale light/dark overview and settings inspected through the actual WebView2 application.
- Mobile `npx tsc --noEmit`: passed after fixing missing dependencies and the theme type.
- Mobile `npx expo export --platform web`: production web bundle exported successfully.
- `git diff --check`: passed.

## Existing issues and limits

- Go lint v2.15.0 reports 10 findings: three formatting findings in existing Go files, three subprocess-input security findings in OpenVPN/SoftEther code, two unused SoftEther parameters, and two govet findings in the npm dependency flatted's bundled Go code.
- VPN connectivity, DNS leak protection, kill-switch enforcement, HTTPS filtering, and blocking against live sites have NOT been verified. The smoke test did not enable the system proxy, install the root CA, or connect to a VPN server.
- The mobile app simulates connections and blocked traffic. It has no native tunnel or traffic-filtering implementation; a persistent preview notice now explains this. Android/iOS native packages were not built.
- Veilora icons now cover desktop, tray, installer, and mobile assets. Compact-window and full keyboard review remain incomplete.
- CI signing and release publishing were not exercised.

## Fixes made during verification

- Normalize Go VPN status strings at the frontend boundary, and filter supported VPN engine strings into the UI's union type.
- Add Expo-compatible keyboard-controller, glass-effect, and Babel preset dependencies plus a mobile lockfile.
- Remove the mobile TypeScript reference to the nonexistent external api-client-react project; select the typed theme palette directly.
- Disable upstream self-updating for the fork and give it separate application names and instance IDs.

Original license, copyright notices, Go import paths, and upstream filter-source attribution are retained.
