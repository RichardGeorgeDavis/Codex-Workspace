# Codex Workspace handover

Status: public framework operational
Last reviewed: 2026-08-10

## Read this first

- This is the current-state checkpoint. Read root `AGENTS.md` first, then use
  `docs/README.md` to select one relevant canonical guide.
- `repos/workspace-hub/` is the only tracked child implementation. Other
  repositories below `repos/` are independent and private by default.
- Generated `cache/context/**/entry.md` packets are optional accelerators. Use
  one only when it is present and fresh; tracked docs and repo files win on any
  conflict.

## Current boundaries

- Keep installs repo-local; share caches only. Do not assume every repository
  uses the same package manager or preview model.
- Keep provider details, credentials, private operator history and private repo
  topology out of the public tree.
- Use `safe-readonly` for ordinary agent work; choose wider MCP access only when
  the task needs it.
- The monthly agent-readability audit is report-only. Findings require review
  before any documentation, script, cache, or automation change.

## Open next when needed

- [Docs router](README.md) for setup, context, runtime, release, and policy
  guidance.
- [First-run guide](08-first-run-and-updates.md) for normal workspace setup.
- [Context and side-load contract](20-ai-context-side-load.md) for generated
  entry packets and provenance.
- [Workspace Hub README](../repos/workspace-hub/README.md) for the tracked app.

## Verification

Run `tools/scripts/doctor-workspace.sh` for environment readiness. Before a
release, use the complete verification sequence in
[10-release-readiness.md](10-release-readiness.md). Always inspect
`git status --short`; generated cache and ignored local state are not canonical.
