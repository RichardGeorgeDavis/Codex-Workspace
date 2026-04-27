# AGENTS.md

## Scope

These instructions apply to Codex Workspace and `repos/workspace-hub` unless a
deeper repo-specific `AGENTS.md` overrides them.

For first-time repo intake, use `docs/09-new-repo-baseline.md`.

## Priorities

Maintain a clean, high-performance mixed-repo workspace.

Prefer:

- clear structure
- independently runnable repos
- shared caches, not shared installs
- direct local dev servers for frontend/WebGL projects
- optional proxy or mapped-host tooling only when it adds value
- pragmatic WordPress handling, usually through Local for existing sites

Never create one shared `node_modules` or equivalent install directory across
unrelated repos.

## Workspace Shape

Expected top-level folders:

- `docs/`
- `repos/`
- `tools/`
- `cache/`
- `shared/`

Use:

- `docs/` for canonical workspace docs and handover
- `.workspace/project.json` for per-repo runtime metadata
- `tools/templates/` for starter templates
- `shared/` for durable workspace metadata
- `cache/` for generated summaries, runtime artifacts, and shared stores

## Token Budget

Keep agent context small by default.

Do not load or summarize these unless the task explicitly needs them:

- `docs/archive/`
- repo `ref/`
- repo `screenshots/`
- `cache/`
- `shared/mempalace/`
- generated reports, large copied HTML, archives, lockfiles, vendor/build output

For fresh context, read:

1. this file
2. `docs/HANDOVER.md`
3. the relevant repo README, handover, manifest, or source files
4. generated `cache/context/.../entry.md` only if useful

Avoid broad historical docs and deep/artifact search by default.

## Workspace Hub

For `repos/workspace-hub`, prefer:

- readable modular code
- explicit runtime/process handling
- conservative repo classification
- graceful status and failure messages
- existing patterns over new abstractions

Avoid:

- assuming all repos use the same package manager
- assuming proxy mode is better than direct local preview
- hard-coding unstable absolute paths beyond the workspace root
- hidden auto-installs or heavy setup steps

When no manifest exists, classify cautiously:

- Vite, static, Three.js, and WebGL repos default to `direct`
- WordPress projects already managed elsewhere default to `external`

## Workspace Memory

Workspace memory is temporarily disabled.

Do not run `tools/bin/workspace-memory` or leave MemPalace closeout as a manual
reminder until the pause is explicitly lifted in tracked docs.

For handover updates:

- repo-specific updates go in repo-local docs and `docs/HANDOVER.md` when relevant
- workspace-level updates go in `docs/HANDOVER.md` and `docs/CHANGELOG.md`
- run `git status --short` before closing so the handover does not imply a cleaner worktree than exists
- if public docs changed, keep `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and relevant repo-local docs aligned

## Upstream Updates

When asked to update reviewed GitHub refs or managed upstream mirrors, use:

- `tools/scripts/manage-workspace-capabilities.sh` for abilities and core services
- `tools/scripts/update-github-refs.sh` for dry runs or applied updates

Do not refresh those sources by hand when a wrapper covers the flow.
