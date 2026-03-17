# AGENTS.md

## Scope

These instructions apply to the **Codex Workspace** and to the **Workspace Hub** repository unless a deeper repo-specific `AGENTS.md` overrides them.

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

The root path is expected to be:

```text
~/Desktop/Work Documents/Codex Workspace/
```

Expected top-level folders:
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

- `tools/docs/` for canonical cross-workspace handover and tooling docs
- `shared/` for workspace-facing metadata and compatibility links
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

## Future-friendly behaviour

Design the workspace so it can grow, but keep implementation practical.

The immediate target is:
- a strong local workspace structure
- a useful Workspace Hub v1
- optional ServBay integration
- reliable daily use
