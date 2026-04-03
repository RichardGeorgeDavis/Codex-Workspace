---
name: workspace-quality-gate
description: Run non-destructive release-readiness checks for Codex Workspace and Workspace Hub
---

# Workspace Quality Gate

Use this skill when the task is about stable release checks, release readiness, or verifying
that Codex Workspace changes did not regress the base environment.

## Default checks

1. Run `tools/scripts/release-readiness.sh`.
2. If agent-tooling files changed, also run `tools/scripts/doctor-agent-tooling.sh`.
3. If shared skills or templates changed, dry-run `tools/scripts/sync-codex-skills.sh repos/workspace-hub`.
4. Confirm Workspace Hub tests, lint, and build pass before calling the change release-ready.

## Safety rules

- Do not mutate sibling repos under `repos/` unless the user explicitly asks.
- Prefer temp fixtures and dry runs over editing existing repo content during verification.
- Preserve existing repo files when testing agent preset scaffolding.

## Expected release signals

- `doctor-workspace.sh` reports the workspace as ready
- `workspace-hub` passes `pnpm test`, `pnpm lint`, and `pnpm build`
- no placeholder TODO metadata remains in shipped workspace surfaces
- the documented `.codex/` contract matches the implementation
