# Workspace Standards

Codex Workspace keeps repositories portable and independently runnable.

## Core Rules

- Do not create a shared dependency install across unrelated repositories.
- Share caches under `cache/`, not `node_modules` or equivalent installs.
- Keep each repo runnable on its own terms.
- Treat ServBay as optional convenience, not a mandatory runtime layer.
- Default frontend-style repos to direct local runtime unless a repo explicitly prefers otherwise.

## Structure

- `repos/` contains runnable repositories and grouped repo folders.
- `docs/` contains the canonical workspace documentation set.
- `tools/` contains shared scripts, templates, manifests, and helper assets.
- `cache/` contains shared package-manager caches and stores.
- `shared/` contains workspace-facing metadata and shared standards.

## Metadata

- Use `.workspace/project.json` when a repo needs explicit runtime metadata.
- Keep repo metadata lightweight and readable.
- Use `shared/repo-index.json` as the shared inventory placeholder until Workspace Hub owns it.

## Runtime Defaults

- `wordpress` repos usually prefer `external`.
- `static`, `vite`, and `threejs` repos usually prefer `direct`.
- Unknown repos should be classified conservatively and require manual override rather than risky assumptions.
