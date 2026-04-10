# AGENTS.md

## Scope

These instructions apply to the **Codex Workspace** and to the **Workspace Hub** repository unless a deeper repo-specific `AGENTS.md` overrides them.

For baseline expectations that should be visible to any newly added repo in this workspace, also use:
- `docs/09-new-repo-baseline.md`

## Primary objective

Maintain a clean, high-performance local workspace for mixed repository types.

Prioritise:
- clear structure
- predictable conventions
- low duplication
- portability of individual repos
- safe local runtime behaviour
- practical support for mixed stacks

## Core rules

### 1. Do not merge unrelated repos into one dependency structure
Never create one shared `node_modules` or equivalent dependency directory across unrelated repositories.

### 2. Share caches, not installs
Favour shared caches and stores under the workspace `cache/` folder.

### 3. Treat each repo as independently runnable
Every repository must remain runnable on its own terms.

### 4. Do not make ServBay mandatory
ServBay is a convenience layer and optional front door, not a required dependency for all repos.

### 5. Prefer direct local runtime for frontend/dev-server projects
Vite, Three.js, WebGL, and similar repos usually work best on their own local ports unless explicitly configured otherwise.

### 6. Keep WordPress handling pragmatic
Do not replace Local by default for existing WordPress projects already using it successfully.

### 7. Use manifests where helpful
Prefer lightweight per-repo metadata files such as `.workspace/project.json` where launch behaviour or preview mode should be explicit.

## Workspace assumptions

The workspace root is the folder named:

```text
Codex Workspace/
```

It may live anywhere on disk.

Expected top-level folders:
- `docs/`
- `repos/`
- `tools/`
- `cache/`
- `shared/`

## Workspace Hub expectations

The `workspace-hub` repo should:

- scan sibling repos under `repos/`
- read or infer repo metadata
- show runtime status
- allow start/stop/open actions
- support both direct local previews and ServBay-linked previews

Do not overcomplicate v1.

## Runtime preferences by repo type

### WordPress
Preferred mode:
- `external`
- usually managed by Local or mapped in ServBay

### Static / Vite / Three.js / WebGL
Preferred mode:
- `direct`

### Other server-side projects
Use repo-native runtime and only proxy through ServBay where it adds clear value.

## Detection guidance

When classifying repos, use file-based inference carefully.

Signals:
- `vite.config.*` → Vite
- Three.js dependency → Three.js/WebGL
- WordPress structure → WordPress
- `index.html` only → static
- `composer.json` + PHP entrypoints → PHP

Where uncertain, classify conservatively and allow manual override.

## File creation guidance

When creating new supporting files, prefer:

- `docs/` for canonical cross-workspace handover and tooling docs
- `shared/` for workspace-facing metadata
- `tools/templates/` for starter templates
- `.workspace/project.json` for per-repo runtime metadata

## Coding guidance for Workspace Hub

Prefer:
- readable, modular structure
- small components
- explicit process/runtime handling
- clear status messages
- graceful failure states

Avoid:
- clever hidden behaviour
- assuming all repos use the same package manager
- assuming proxy mode is always better
- hard-coding unstable absolute paths beyond the agreed workspace root

## Good defaults

When there is no explicit manifest:

- classify cautiously
- default frontend-style repos to `direct`
- default WP projects already managed elsewhere to `external`
- do not auto-run heavy install steps without clear reason

## Upstream updates

When a user asks to update the workspace's reviewed GitHub refs or managed upstream mirrors, use:

- `tools/scripts/manage-workspace-capabilities.sh` for abilities and core services
- `tools/scripts/update-github-refs.sh` for dry runs or applied updates

Do not refresh those sources by hand when the wrapper already covers them.

## Handover closeout

When a user asks for a handover update, treat that as a memory-closeout request too.

Default behavior:

- if the handover update is repo-specific, run `tools/bin/workspace-memory save-repo <repo-name>` after the docs update
- if the handover update is workspace-level, docs-level, or release-level, run `tools/bin/workspace-memory save-workspace` after the docs update
- if both repo and workspace handover surfaces changed in one slice, run the closeout commands serially rather than in parallel
- run a quick `git status` sanity check before closing the chat so the handover does not imply a cleaner worktree than actually exists
- if public docs changed, confirm the public surfaces stay aligned: `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and the relevant repo-local README when one exists

Do not leave MemPalace closeout as a manual reminder when the user explicitly asked for a handover update.

## New repo baseline

When a repo is first added under `repos/`, assume the baseline in `docs/09-new-repo-baseline.md` applies unless that repo already has clearer local instructions.

## Future-friendly behaviour

Design the workspace so it can grow, but keep implementation practical.

The immediate target is:
- a strong local workspace structure
- a useful Workspace Hub v1
- optional ServBay integration
- reliable daily use
