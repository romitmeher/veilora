# Headless standalone audit â€” 2026-11-21

Scope: code tests and build checks only. No browser, desktop automation, application launch, VPN connection, certificate installation, or DNS/firewall changes were performed during this headless audit. VPN tests use a fake engine and an in-memory management connection.

## Reproduced and corrected

- VPNGate profiles were base64-encoded a second time by the manager. A regression test failed for OpenVPN and passed for SoftEther before the fix. Both engines now receive the original once-encoded profile.
- Synchronous engine startup failure left the stored status at `connecting`. The regression test reproduced this. Failure now records `error` and notifies the frontend after releasing the manager lock.
- OpenVPN management did not request state notifications before releasing its startup hold. It now sends `state on` before `hold release`. An in-memory protocol test verifies command order and delivery of a `CONNECTED` notification.
- The OpenVPN process waiter now receives the actual process object instead of reading a mutable pointer that disconnect can clear. The initial connecting status is queued before starting event readers.

Tests also check that an unavailable engine is not invoked and that the executable embeds production frontend JavaScript rather than a Vite development-server page.

## Standalone verdict

The desktop UI embeds its assets and does not require Node.js, Go, or a Vite server on the end user's machine. Windows still requires WebView2. Ad blocking is implemented in the Go process.

**VPN is not self-contained.** The current installer includes the application and WebView2 setup, but neither OpenVPN nor SoftEther nor their tunnel drivers. Engine discovery checks PATH only. Packaging these components, handling their installation and permissions, and validating them on a clean machine remain unfinished. No new all-in-one installer was produced by this audit.

## Remaining functional blockers found by code inspection

- Windows kill switch creates a blanket outbound block before trying an adapter allow rule. It has no rollback on partial setup failure. The manager also disables the kill switch on connection failure/drop, contrary to a persistent fail-closed guarantee. This needs redesign and isolated-machine integration tests.
- Windows DNS handling saves only one IPv4 resolver, then overwrites all active adapters. It cannot restore per-adapter configuration or DHCP accurately. PowerShell operations also need reliable error propagation.
- Protection flags describe requested settings even when enabling protection fails; those failures are only logged.
- SoftEther reports connected after its configuration command exits, without checking tunnel/session state.
- Live VPN routing, DNS leaks, kill-switch enforcement, and HTTPS filtering are unverified. These require an isolated test machine with drivers and explicit network tests; unit tests cannot establish those properties.

## Validation

Passed: desktop `npm run build`, desktop `npm run lint` (zero errors), root `go test ./...` including the new regression tests, mobile `npx tsc --noEmit`, and Windows compilation with `wails build -skipbindings -s` (executable not launched). Use `task` equivalents when installed. The current environment has no Task or GCC, so Go tests run without race mode.

Frontend lint has five existing hook-dependency warnings. The follow-up CI cleanup fixes Go formatting and unused parameters, documents narrowly reviewed subprocess/path false positives, and limits lint to the root and internal application packages rather than npm dependency sources. Local Go lint now reports zero issues. The frontend lockfile and formatting were repaired, the empty Scorecard workflow was removed, and a headless test workflow was added. These checks do not certify the app as a working standalone VPN.
