# Veilora validation â€” 2026-11-21

See the newer [headless standalone audit](HEADLESS-AUDIT.md) for reproduced VPN bugs, fixes, and remaining packaging/protection blockers. The native UI checks below were performed earlier, before the headless-only constraint.

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

- Follow-up CI cleanup: Go lint v2.15.0 reports zero issues for `. ./internal/...`. Earlier formatting/unused-parameter findings were fixed; subprocess/path false positives have narrow explanations, and npm dependency Go files are excluded from application checks. Frontend formatting and Linux-targeted npm lockfile validation also pass.
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
