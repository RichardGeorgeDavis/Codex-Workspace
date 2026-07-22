# Workspace Hub codebase map

## Last reviewed

2026-07-13, using the privacy-reviewed Graphify `0.9.11` pilot.

## Purpose

Workspace Hub is the local React and Express control plane for discovering,
inspecting, launching, and monitoring independently runnable repositories.

## Main entry points

- `src/main.tsx` starts the web application.
- `server/index.ts` starts the local API.

## Main modules

- `server/workspace.ts` coordinates repository discovery and summary data.
- `server/runtime-manager.ts` handles explicit local runtime processes.
- `server/workspace-capabilities.ts` exposes tracked capability state.
- `server/repo-intake.ts` applies conservative repository intake behavior.
- `server/workspace-search.ts` provides thin and deep local search paths.

## Key graph hubs

- `buildRepoRecord()` was the most connected symbol at 37 edges.
- `App()`, `postJson()`, `readWorkspaceCapabilities()`, and
  `publishWorkspaceEvent()` connect major UI, API, capability, and event flows.
- Community navigation highlighted `workspace.ts`, `workspace-capabilities.ts`,
  `workspace-search.ts`, `runtime-manager.ts`, `repo-intake.ts`, and
  `RepoDetails.tsx` as the primary architectural surfaces.

## Graph status and limitations

The graph is local navigation evidence, not an authority. The pilot excludes
docs, media, local data, generated output, dependencies, credentials, and agent
artifacts. Relationships used for implementation must be checked against source.

The generic natural-language hub query was noisy during the pilot; use the
report's God Nodes and Community Hubs sections for connectivity review.

## Refresh schedule

Refresh weekly while active, after structural changes, and before release or
handover. Do not refresh automatically.
