# Handover

## Purpose

This file is the practical handoff summary for the current Codex Workspace state.

Use it after reading the core handover pack when you need to understand:

- what has already been built
- where the canonical docs now live
- what remains to be done next

## Canonical doc location

The canonical handover Markdown now lives in:

```text
docs/
```

The `shared/` folder now holds workspace metadata such as:

- `shared/repo-index.json`
- `shared/standards.md`

## Current workspace state

The workspace foundation is in place:

- `docs/`, `repos/`, `tools/`, `cache/`, and `shared/` exist
- shared cache placeholders exist
- shared helper scripts exist under `tools/scripts/`
- template files exist under `tools/templates/`
- the handover pack now lives under `docs/`

## Current Workspace Hub state

The `repos/workspace-hub/` repo has been scaffolded and is independently runnable.

Implemented so far:

- repo discovery across sibling repos under `repos/`
- conservative repo classification
- manifest-aware repo metadata
- repo intake scaffolding for `README.md`, cover placeholders, and conditional manifest creation
- open actions for repo, README, manifest, preview, and terminal
- start, stop, and restart runtime controls
- health checks for local URLs
- persisted per-repo metadata overrides
- manifest authoring for `.workspace/project.json`
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

## Recommended pickup point

The most practical next product step is:

1. Add repo diagnostics in `workspace-hub`
2. Surface Git branch and dirty state
3. Surface dependency-readiness warnings for repos with commands but missing installs

The next useful docs step is:

1. Expand runtime troubleshooting and operator guidance under `repos/workspace-hub/docs/`

## Completion review

The workspace is not fully complete against the broadest interpretation of the original roadmap.

What appears complete or substantially complete:

- workspace foundation
- shared tooling and caches
- initial Workspace Hub build
- repo discovery
- repo detection
- manifest support
- core repo actions
- runtime start or stop flows
- persisted metadata
- manifest authoring

What still reads as open or partial in the docs:

- richer repo diagnostics
- favourites and last-opened persistence
- clearer dependency-readiness feedback
- fuller ServBay-aware polish beyond the current optional stance
- additional runtime troubleshooting documentation

## Reading order from here

If continuing implementation, read in this order:

1. `04-build-order-and-dod.md`
2. `03-workspace-hub-build-spec.md`
3. `CHANGELOG.md`
4. `../../repos/workspace-hub/README.md` if working inside the Hub repo
