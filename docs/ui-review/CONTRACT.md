> Historical design draft, superseded by [the reference revision](REFERENCE-REVISION.md).

# Veilora desktop UI contract

Purpose: inspect VPN and ad-blocking state, then manage each independently.
Primary action: enable/pause ad blocking in a persistent footer. VPN connect/disconnect stays on the VPN screen.
Audience: desktop users who need an honest, quick view of connection state.
Direction: quiet utility; charcoal and warm white surfaces, teal active controls, a split-V identity, generous spacing.
Hierarchy: brand header; left navigation; page title; backend status; details; persistent blocking footer.
Reference: the previous 450x670 native app wrapped navigation labels and gave Start no context next to VPN Connect. The new window defaults to 980x760 and permits resizing down to 720x600.
Constraints: retain Wails/React/Blueprint; no added UI dependencies; retain translated screens; new English keys use the existing fallback locale. Respect light/dark themes and reduced motion. Never fabricate request counts, VPN locations, or protection state.
Target windows: default 980x760 and minimum 720x600. Native chrome reduces the content area.
States: paused/empty uses an explanation and filter-list action; loading uses backend progress; errors remain visible in existing toasts/status messages; active state uses actual backend status. Connected, blocking-active, and certificate-permission flows require live networking/system changes and will be recorded as untested if not exercised.
