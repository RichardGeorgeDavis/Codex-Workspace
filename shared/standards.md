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

## Agent Portability

- Keep official Codex repo-local skills in `.codex/skills/`.
- Use `.agents/skills/` only as a tracked compatibility mirror when a repo benefits from it.
- Keep portable shared skill source material in `shared/skills/` or optional repo-local `.workspace/skills/`.
- Treat non-Codex folders such as `.claude/skills/` and `.github/skills/` as optional adapter targets rather than the canonical source.
- Keep portable MCP examples separate from real credentials and machine-specific settings.
- Store local-only agent config, exports, and secrets in ignored locations such as `tools/local/`.
- Keep optional local workflow-state folders separate from tracked docs, specs, manifests, and skills.
- Do not make AI-agent setup a required dependency for normal repo runtime.
- Promote stable, broadly useful local guidance into tracked docs or skills instead of leaving it only in private notes.

## Context Cache

- Keep generated context summaries under `cache/context/`.
- Treat generated `abstract.md` and `overview.md` files as cache layers, not source-of-truth docs.
- Keep provenance metadata such as `sources.json` alongside generated summaries where helpful.
- Read tracked docs and manifests before trusting stale generated summaries.
- Keep local-only retrieval logs and operator memory untracked.
- Keep classification and summary inputs explainable where practical.
- Keep machine-specific operator memory separate from canonical repo facts.

## Runtime Defaults

- `wordpress` repos usually prefer `external`.
- `static`, `vite`, and `threejs` repos usually prefer `direct`.
- Unknown repos should be classified conservatively and require manual override rather than risky assumptions.
