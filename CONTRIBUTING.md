# Contributing to Veilora

This repository is a fork of Zen. Work on Veilora belongs in [romitmeher/veilora](https://github.com/romitmeher/veilora); upstream Zen maintainers do not provide support for changes made here.

## Development

Follow the [README](README.md#getting-started) and [platform requirements](docs/internal/requirements.md). Keep changes focused, preserve upstream copyright notices, and avoid committing build outputs, credentials, local logs, or exported user configuration.

Use `task lint` after changes and `task test` after Go changes. If Go Task is unavailable, the equivalent commands are in the README. Report existing failures and untested behavior honestly; a UI simulation must never be described as active VPN or filtering protection.

## Translations and design

See the [localization guide](docs/internal/localization-guide.md). New strings should use the translation system, with English as the fallback. Keep light/dark themes, keyboard access, and reduced motion working. Use the existing layout and motion tokens.

## Reporting problems

Include the OS, commit/version, reproduction steps, expected behavior, and actual behavior. Remove hostnames, IP addresses, credentials, and other private details from logs or screenshots before sharing them. For vulnerabilities, read [SECURITY.md](SECURITY.md).

Automation agents must follow [AGENTS.md](AGENTS.md), including its prohibition on creating issues or pull requests.

Contributions are distributed under this project's [MIT license](LICENSE).
