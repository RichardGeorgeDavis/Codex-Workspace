# Handover

This is the short current-state handover. Older implementation logs are archived
in `docs/archive/HANDOVER-history-2026-04.md` and should be opened only when a
specific historical detail is needed.

## Fresh Chat Path

Default read order:

1. `AGENTS.md`
2. this file
3. the directly relevant repo README, handover, manifest, or source files
4. `cache/context/.../entry.md` only when a generated side-load packet is useful

Avoid loading full archived handover logs, `ref/`, `screenshots/`, `cache/`,
`shared/mempalace/`, generated reports, or deep search results unless the task
explicitly needs them.

Workspace memory is temporarily disabled. Do not run `tools/bin/workspace-memory`
or use Hub memory command actions until the pause is explicitly lifted.

## Current Baseline

- workspace release tag: `v1.2.2`
- `repos/workspace-hub` version: `1.2.2`
- stable release gate passed on `2026-04-10`
- current release URL: `https://github.com/RichardGeorgeDavis/Codex-Workspace/releases/tag/v1.2.2`

The workspace foundation is in place:

- `docs/`, `repos/`, `tools/`, `cache/`, and `shared/` are the expected top-level folders
- helper scripts live under `tools/scripts/`
- templates live under `tools/templates/`
- installable abilities and core services are tracked in `tools/manifests/workspace-capabilities.json`
- optional abilities live under `repos/abilities/`
- `tools/ref/` is reference-only and can remain empty unless a reviewed snapshot is explicitly refreshed
- launcher commands coordinate ports through `cache/runtime/ports/`

## Token Budget Rules

Keep agent context small by default:

- read short current docs before historical logs
- use generated `entry.md` packets before `abstract.md` or `overview.md`
- keep Workspace Hub search in `thin` mode unless a task needs deep results
- keep `WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS` unset or false
- treat `ref/`, `screenshots/`, archives, large generated HTML, `cache/`, and `shared/mempalace/` as opt-in evidence paths
- summarize findings from large files instead of pasting or loading entire files into chat

## Workspace Hub

`repos/workspace-hub/` is independently runnable and is the stable local
dashboard baseline.

Implemented:

- repo discovery under `repos/`
- conservative repo classification
- `.workspace/project.json` manifest support
- repo-local agent tooling detection for `AGENTS.md`, `.codex/`, `.agents/skills`, `.opencode/`, and `.omx`
- repo intake scaffolding for README, cover placeholders, and conditional manifests
- repo open actions, direct previews, runtime controls, and health checks
- live event streaming, local indexed search, and structured failure reports
- capability and core-service surfacing from the tracked manifest
- base-summary refresh with selected-repo detail hydration
- side-load freshness visibility for generated context packets

Workspace memory UI exists, but command actions are paused because
`tools/bin/workspace-memory` is disabled.

## Current Pickup Points

Practical next work:

- keep future changes end-to-end and update this file plus `docs/CHANGELOG.md`
- keep public surfaces aligned when workspace-wide behavior changes:
  `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and relevant repo-local docs
- apply managed MCP profiles only on machines that need them
- keep `safe-readonly` versus `default-full` MCP usage intentional
- extend cross-stack dependency detection only if operators need broader readiness checks
- deepen Memory Graph only after the disabled workspace-memory path has been reviewed

## Workspace Memory Pause

`tools/bin/workspace-memory` exits immediately with a disabled message. This
pauses MemPalace closeout, ingest, search, wake-up, export, and graph commands.

Current closeout behavior:

- record repo closeout in tracked repo docs such as `README.md`, `HANDOVER.md`, or `DESIGN.md`
- record workspace closeout here and in `docs/CHANGELOG.md`
- use generated side-load summaries under `cache/context/` only as optional local context
- do not leave MemPalace closeout as a manual reminder while the pause is active

Reason for the pause: repeated repo closeout attempts hit the MemPalace write
lock while a live `save-repo` embedded a large mirrored reference corpus. The
wrapper has broader excludes and better diagnostics, but the service stays
paused until the closeout contract is reviewed.

## Repo Intake

Repo intake should stay conservative:

- create or normalize `README.md`
- add a Workspace Hub cover block and placeholder image when helpful
- write `.workspace/project.json` only when runtime behavior is not obvious
- do not auto-install dependencies or auto-start runtimes during intake
- do not run MemPalace closeout while workspace memory is paused

For public site reference copies:

- record source URL, capture date, and acquisition method in repo docs
- prefer `tools/scripts/capture-site-reference.sh --run <url> <target-dir>` when `httrack` is available
- store fallback assets in repo-local `ref/` with source notes
- create a separate rebuild repo if maintainable editing is the real goal

## Useful Commands

Workspace-level:

```bash
tools/scripts/bootstrap-workspace.sh --run
tools/scripts/doctor-workspace.sh
tools/scripts/doctor-agent-tooling.sh
tools/scripts/release-readiness.sh
tools/scripts/manage-workspace-capabilities.sh list
tools/scripts/update-all.sh --list-groups
```

Workspace Hub:

```bash
pnpm --dir "repos/workspace-hub" lint
pnpm --dir "repos/workspace-hub" typecheck
pnpm --dir "repos/workspace-hub" test
pnpm --dir "repos/workspace-hub" build
```

Context side-load, when useful:

```bash
tools/scripts/generate-context-cache.sh --workspace --run
tools/scripts/generate-context-cache.sh --repo workspace-hub --run
```

## Reference Docs

- `docs/08-first-run-and-updates.md`
- `docs/09-new-repo-baseline.md`
- `docs/10-release-readiness.md`
- `docs/11-core-memory-and-reference-promotion.md`
- `docs/12-maintainer-runbook.md`
- `docs/14-git-and-github-workflow.md`
- `docs/20-ai-context-side-load.md`
- `docs/21-agent-token-budget.md`
- `repos/workspace-hub/README.md`
