# Tools Docs

This folder is the canonical home for shared workspace documentation and the Codex Workspace handover pack.

Use the workspace root [README.md](/Users/richard/Desktop/Work%20Documents/Codex%20Workspace/README.md) as the top-level entrypoint, then use this folder for the actual handover files and tooling docs.

## Core pack

Read these in order:

1. `00-overview.md`
2. `01-codex-workspace-handover.md`
3. `02-local-runtime-handover.md`
4. `03-workspace-hub-build-spec.md`
5. `04-build-order-and-dod.md`
6. `05-examples-and-templates.md`
7. `HANDOVER.md`
8. `CHANGELOG.md`

## Folder roles

- `00-overview.md` to `05-examples-and-templates.md` define the handover pack.
- `HANDOVER.md` summarizes the current state of the workspace after the initial build.
- `CHANGELOG.md` records notable workspace-level changes.
- `tools/bin/` holds small wrappers or launch helpers.
- `tools/scripts/` holds reusable workspace scripts.
- `tools/templates/` holds starter metadata templates.
- `tools/manifests/` holds source lists and supporting manifests for scripts.

Useful maintenance script:

- `tools/scripts/cleanup-sync-noise.sh` removes macOS and sync-client noise files such as `Icon\r` and `._*`, including the broken-ref cases when they leak into `.git/`.
- `tools/scripts/trim-git-repos.sh` performs safe Git maintenance across `repos/` by cleaning `.git` sync noise, expiring older reflog entries, and running `git gc` with a conservative prune window.

## Shared exposure

The `shared/` folder exposes linked copies of the core handover docs for compatibility, alongside workspace metadata such as `shared/repo-index.json` and `shared/standards.md`.

## Recommended machine-level tools

- Core: `git`, `gh`, `jq`, `rg`, `fd`, `tree`
- Node: a version manager plus `npm`, `pnpm`, and `yarn` where legacy repos need it
- Python: `python3`, `pip`, optional `uv`
- PHP: `composer`, `wp`, optional ServBay or Local

## Shared cache targets

- npm: `cache/npm`
- pnpm: `cache/pnpm-store`
- yarn: `cache/yarn`
- pip: `cache/pip`
- Homebrew downloads: `cache/homebrew`

Map package-manager caches here where practical, but keep project installs inside each repo.
