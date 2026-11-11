# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-11-10

### Added
- Live terminal in the hero: a boot sequence from real runtime data, then heartbeats with round-trip time (#5)
- `/api/system` endpoint: Cloud Run region and instance, Node version, platform, memory, uptime, request count and cold start (#5)
- macOS-style title bar for the terminal window (#5)

### Improvements
- Heartbeats every 10s, paused while the tab is hidden, and stopped after 2 minutes with a "resume tail" button, so Cloud Run can scale to zero (#5)

## [2.0.0] - 2026-11-10

First tagged release: React + TypeScript one-pager on Cloud Run, with CI, a manual deploy workflow, Dependabot, Vitest, ESLint and commitlint (#1, #3, #4).

[2.1.0]: https://github.com/soonland/shipit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/soonland/shipit/releases/tag/v2.0.0
