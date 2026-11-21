# Veilora security notes

Veilora is a development fork of Zen. A successful build or test run is not a security audit. Live VPN connectivity, kill-switch enforcement, DNS leak prevention, and HTTPS filtering have not been validated end to end for this fork. See [validation details](docs/VALIDATION.md).

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for [this repository](https://github.com/romitmeher/veilora/security) if it is enabled. Otherwise, contact the repository owner through a verified channel to arrange private disclosure before sending details. Do not post exploit details, private keys, or user traffic in a public issue.

Include the affected commit, platform, reproduction steps, and likely impact. This fork has no published response-time guarantee. Upstream-only problems should follow [Zen's security policy](https://github.com/irbis-sh/zen-desktop/security/policy).

## Boundaries

- HTTPS interception uses a local root CA; only enable it after reviewing the behavior and local certificate handling.
- VPN servers are operated by third parties. The presence of a VPN connection does not establish that an operator is trustworthy.
- The mobile app is a simulation, not a VPN or ad blocker.
- Self-updates are disabled. Signing and release credentials must be configured for this fork independently.
- The inherited [architecture document](docs/internal/security-architecture.md) describes upstream design; it is not an audit or infrastructure guarantee for Veilora.
