# Documentation Instructions

Use this folder for repo-local documentation that does not need to live in the root `README.md`.

## Structure

- Keep `README.md` at the repo root as the main entrypoint.
- Put supporting notes, design decisions, operator guidance, and feature-specific docs in `docs/`.
- Keep `data/` free of explanatory Markdown unless a runtime workflow truly requires a file beside the data itself.
- Keep public tracked docs generic; put personal or machine-specific notes in ignored `*.local.md` files.

## Current docs

- `local-overview.md` explains how to keep local-only notes and manifest overrides out of the public repo.
- `discovery.md` explains Repo Discovery, archive listing, filters, and the current dashboard rail layout.
- `manifest.md` documents the supported `.workspace/project.json` fields and write behaviour.
- `data.md` explains what the local `data/` folder is for.
- `memory-graph.md` defines the MemPalace graph-visualization feature and its adapter-first design.
- `runtime-troubleshooting.md` covers missing installs, failed runtime starts, and port conflicts.
- `skills.md` explains extension patterns without assuming a specific local skills setup.

## Writing guidance

- Prefer short, practical documents over long handover dumps.
- Update docs when repo behaviour, API routes, or manifest fields change.
- Keep examples aligned with the current `.workspace/project.json` support.
- Use `.workspace/project.local.json` and `docs/*.local.md` for local-only operator details.
- Do not duplicate the same instructions across multiple Markdown files unless one is an intentional summary.

## Next useful docs

- Repo operator notes for any collection that needs custom start or preview behaviour.
