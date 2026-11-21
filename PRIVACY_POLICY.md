# Veilora privacy notes

Last updated: November 21, 2026.

These notes describe the code in this repository and its current limitations. Veilora is a fork of Zen; upstream service policies and infrastructure commitments do not automatically apply to it.

## Local data

The desktop app stores configuration, filter data, and diagnostic logs locally. Its request-history interface can show blocked requests. HTTPS filtering uses a locally generated certificate and private key to inspect traffic routed through its proxy. Review logs and debug exports before sharing them: VPN endpoints and other operational details may be present.

The mobile prototype stores preferences, selected-server information, and simulated blocking statistics using AsyncStorage. Its connection and blocking displays are simulations.

## Network requests

- Filter subscriptions contact their configured providers to download rules.
- VPN server discovery contacts VPNGate. Connecting through a VPN involves the selected third-party operator and your installed VPN client.
- The mobile prototype contacts VPNGate for a server list and api.ipify.org for public-IP information during its simulated connection flow. These requests do not create a tunnel.
- DNS protection code can change system DNS when enabled. The configured resolver receives DNS queries according to system routing.
- Repository/help links open external sites. Those sites and service providers can receive ordinary connection metadata, including your IP address.
- Upstream automatic update checks are disabled in this fork.

## Your controls

The app provides controls to stop filtering, disconnect its VPN integration, manage filters and exceptions, export diagnostic data, and uninstall its root CA. Back up settings you want to keep before manually removing application data.

No independent privacy audit or end-to-end protection verification is claimed. Read [SECURITY.md](SECURITY.md) and [VALIDATION.md](docs/VALIDATION.md) for current limits.
