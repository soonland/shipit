# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [2.4.0] - 2026-11-11

### Added
- Preview deployment for every pull request: a no-traffic Cloud Run revision tagged `pr-<number>`, smoke-tested, linked in a PR comment and removed when the PR closes; the page shows a "preview · PR #n" badge (#16)
- Pipeline section updated to the current flow, with a new Preview stage (seven stages) (#16)
- Monitoring managed with Terraform: dashboard, uptime check, email channel and alert policies, with state in a private versioned bucket (#14)
- Terraform workflow: plan on pull requests posted as a comment (read-only identity), apply via "Run workflow" on main only (#15)

### Improvements
- Production deploys send 100% of traffic to the new revision explicitly, so previews never affect production (#16)

## [2.3.1] - 2026-11-10

### Improvements
- Cloud Run runtime settings are applied on every deploy: dedicated `shipit-runtime` service account, max 3 instances, 256 MiB, 60 s timeout and a liveness probe on `/health` (#12)

### Bug Fixes
- `setup-runtime-sa.sh` retries while a new service account propagates (#12)

## [2.3.0] - 2026-11-10

### Added
- Chaos mode: `/api/chaos/error`, `/api/chaos/slow` and `/api/chaos/crash`, off unless a secret code is configured, rate limited, with structured logs (#10)
- Terminal commands: `help`, `status`, `tail`, `clear` and `chaos …`, with command history (#10)
- Terminal status bar with a lock to unlock chaos mode, the tail state and the chaos state (#10)
- Cloud Monitoring dashboard, uptime check on `/health` and alert policies for downtime, 5xx errors and slow responses, versioned in `monitoring/` (#10)

## [2.2.0] - 2026-11-10

### Added
- Interactive pipeline: six real stages (Commit, CI, Release, Build, Deploy, Live); click one to see what happens, where it runs and the real command (#8)
- "Simulate a release" button: stages run one by one, weighted by real durations, with a progress line, then the live version and revision (#8)
- Deploys run automatically when a release tag is pushed, after checking the tag matches `package.json` (#7)

### Improvements
- Neon palette: electric cyan-blue and violet with glow effects (#8)

### Bug Fixes
- Progress line reaches each stage exactly when it starts (#8)
- Checkmark on completed stages stays readable when selected or hovered (#8)
- Running-stage spinner is centred (#8)

## [2.1.0] - 2026-11-10

### Added
- Live terminal in the hero: a boot sequence from real runtime data, then heartbeats with round-trip time (#5)
- `/api/system` endpoint: Cloud Run region and instance, Node version, platform, memory, uptime, request count and cold start (#5)
- macOS-style title bar for the terminal window (#5)

### Improvements
- Heartbeats every 10s, paused while the tab is hidden, and stopped after 2 minutes with a "resume tail" button, so Cloud Run can scale to zero (#5)

## [2.0.0] - 2026-11-10

First tagged release: React + TypeScript one-pager on Cloud Run, with CI, a manual deploy workflow, Dependabot, Vitest, ESLint and commitlint (#1, #3, #4).

[2.4.0]: https://github.com/soonland/shipit/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/soonland/shipit/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/soonland/shipit/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/soonland/shipit/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/soonland/shipit/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/soonland/shipit/releases/tag/v2.0.0
