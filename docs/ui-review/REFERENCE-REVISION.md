# Reference-led desktop revision — 2026-11-21

References inspected: https://torph.lochie.me/ and https://www.fluidfunctionalism.com/, including its typography, surfaces, and motion documentation.

Contract: keep the actual filtering/VPN controls and backend state. Remove oversized shield decoration, uppercase eyebrows, repeated status panels, and patterned wallpaper. Use a compact left rail, restrained grayscale surfaces, a consistent 12/13/14/28px type hierarchy, 36px navigation rows, and one moving hover highlight. Keep the existing Veilora logo as the small brand accent.

Torph 0.1.4 is used for real status-label changes with 160ms transitions and respectReducedMotion enabled. Other interaction timings share 80/160/240ms tokens; CSS motion is disabled under prefers-reduced-motion. No automatic/demo state cycling is added.

Targets: native default 980x760; minimum 720x600. Inspect dark/light rendering, keyboard focus and navigation, overview and VPN settings. Live VPN, filtering, and certificate actions remain outside this visual review.
