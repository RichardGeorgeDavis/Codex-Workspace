# Handover

## Purpose

This file is the practical handoff summary for the current Codex Workspace state.

Use it after reading the core handover pack when you need to understand:

- what has already been built
- where the canonical docs now live
- what remains to be done next

Current release baseline:

- workspace release tag: `v1.0.0`
- `repos/workspace-hub` version: `1.0.0`
- stable release gate passed on `2026-04-03`

## Canonical doc location

The canonical handover Markdown now lives in:

```text
docs/
```

The `shared/` folder now holds workspace metadata such as:

- `shared/repo-index.json`
- `shared/standards.md`

## Current workspace state

The workspace foundation is in place and released as a stable baseline:

- `docs/`, `repos/`, `tools/`, `cache/`, and `shared/` exist
- shared cache paths and helper conventions exist
- shared helper scripts exist under `tools/scripts/`
- template files exist under `tools/templates/`
- the handover pack now lives under `docs/`
- reviewed upstream references have been promoted into tracked workspace features, docs, templates, and skills
- `tools/ref/` is reference-only and can remain empty until explicitly repopulated

## Current Workspace Hub state

The `repos/workspace-hub/` repo is independently runnable and now represents the stable local dashboard baseline.

Implemented so far:

- repo discovery across sibling repos under `repos/`
- conservative repo classification
- manifest-aware repo metadata
- repo-local agent tooling detection for `AGENTS.md`, `.codex/`, `.agents/skills/`, `.opencode/`, and `.omx/`
- repo-local agent preset scaffolding for Codex baseline, OMX-ready, OpenCode, and all-in-one flows
- repo intake scaffolding for `README.md`, cover placeholders, and conditional manifest creation
- open actions for repo, README, manifest, preview, and terminal
- start, stop, and restart runtime controls
- health checks for local URLs
- lightweight direct local preview bootstrapping for static repos
- persisted per-repo metadata overrides
- manifest authoring for `.workspace/project.json`
- live event streaming, local indexed search, and structured failure reports
- fixture-based tests for agent tooling and preset scaffolding
- repo-local documentation under `repos/workspace-hub/docs/`

## Repo intake notes

The current repo intake flow in `workspace-hub` is intentionally conservative.

- it uses the tracked templates in `tools/templates/repo-docs/`
- it creates or normalizes `README.md`
- it injects the Workspace Hub cover block and ensures a repo-local placeholder cover image exists
- it writes `.workspace/project.json` only when the repo appears to need explicit runtime metadata
- it keeps an existing manifest if one is already present
- it does not auto-install dependencies or auto-start runtimes as part of intake

This keeps intake focused on first-pass repo clarity rather than hidden setup side effects.

## Release verification status

The stable release gate has already been exercised successfully:

- `tools/scripts/bootstrap-workspace.sh --run`
- `tools/scripts/doctor-workspace.sh`
- `tools/scripts/doctor-agent-tooling.sh`
- `tools/scripts/release-readiness.sh`
- live Workspace Hub smoke checks for:
  - one direct-preview repo
  - one external WordPress repo
  - one mixed-stack SwiftPM repo

## Recommended pickup point

The most practical next product step is:

1. Keep the stable release gate current as new workspace features land
2. Tighten richer diagnostics in `workspace-hub` for dependency and runtime edge cases
3. Add release-note and maintenance polish rather than more foundational restructuring

The next useful docs step is:

1. Expand runtime troubleshooting and operator guidance under `repos/workspace-hub/docs/`
2. Keep `docs/10-release-readiness.md` and this handover note aligned after each release-worthy change

## Completion review

The workspace now meets the practical stable baseline, but it is still open to normal product iteration.

What appears complete or substantially complete:

- workspace foundation
- shared tooling and caches
- stable Workspace Hub 1.0 baseline
- repo discovery
- repo detection
- manifest support
- core repo actions
- runtime start or stop flows
- persisted metadata
- manifest authoring
- stable release gate and docs
- shared skill sources and agent tooling support
- shared Playwright browser cache support

What still reads as open or partial in the docs:

- richer repo diagnostics
- favourites and last-opened polish
- clearer dependency-readiness feedback
- fuller ServBay-aware polish beyond the current optional stance
- additional runtime troubleshooting documentation

## Reading order from here

If continuing implementation, read in this order:

1. `10-release-readiness.md`
2. `CHANGELOG.md`
3. `03-workspace-hub-build-spec.md`
4. `../../repos/workspace-hub/README.md` if working inside the Hub repo
