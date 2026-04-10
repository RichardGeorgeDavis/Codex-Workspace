# MemPalace Graph Visualization

This note defines the graph-visualization feature for Workspace Hub's MemPalace integration.

The goal is to make workspace memory easier to inspect without turning graph rendering into a second memory system.

## Decision

Use MemPalace as the source of truth for memory.

Add a graph adapter and graph view on top of MemPalace data.

Do not add `graphify` as a second ingestion engine for the same workspace corpus.

## Why

The current Workspace memory page already treats MemPalace as the owned workspace service for:

- target-aware save flows
- retrieval search
- wake-up summaries
- conversation export and mining
- workspace-safe wrapper actions

That is the correct ownership boundary.

What is still missing is a visual way to inspect:

- which rooms or domains a target contains
- which entities and projects are present
- which concepts co-occur or bridge multiple areas
- which memory surfaces are thin, noisy, or under-structured

## Current local data shape

Current repo-local MemPalace sidecars are still thin.

Example from `repos/workspace-hub/.workspace/mempalace/`:

- `mempalace.yaml` currently provides wing and room structure
- `entities.json` currently provides only lightweight entity buckets such as `projects`

That means the graph feature needs a normalization step.

The first version should not assume that MemPalace already exposes a rich, directly renderable graph.

## Proposed model

### 1. Normalize MemPalace data into a graph-ready shape

Add a workspace-owned export step that reads MemPalace data and emits a graph document for one selected target.

Preferred command shape:

```bash
tools/bin/workspace-memory build-graph <target>
```

Where `<target>` is one of:

- `workspace-docs`
- `current-repo`
- `repo <relative-path>`

### 2. Keep the source of truth and the view artifacts separate

Use:

- MemPalace data and sidecars as the source of truth
- graph export artifacts as rebuildable derived output

Preferred output location:

```text
cache/mempalace/<user>/graphs/<target-slug>/
```

Expected files:

- `graph.json`
- `graph.html`
- `graph-report.md`
- optional `graph.graphml`

This keeps the graph disposable and rebuildable.

### 3. Show the graph in Workspace Hub

Add a new graph card or graph section to the MemPalace page with:

- `Build graph`
- `Rebuild graph`
- `Open graph`
- `Open graph folder`
- `Last built at`
- `Node count`
- `Edge count`

The graph should remain tied to the currently selected memory target.

## Graph schema

The first version should stay simple and explicit.

### Node types

- `target`
- `room`
- `entity`
- `project`
- `person`
- `topic`
- `memory-item`
- `conversation`

### Edge types

- `contains`
- `belongs_to_room`
- `mentioned_in`
- `co_occurs_with`
- `derived_from`
- `references`
- `bridges`

### Confidence and provenance

Every edge should carry:

- `source`
- `confidence`
- `derived`

Use these rules:

- direct sidecar structure is `direct`
- normalized relationships inferred from co-occurrence are `derived`
- weak heuristics should be visibly marked and filterable

## Relationship to graphify

`graphify` is useful here as a renderer and graph-exploration reference, not as the memory owner.

Good reuse candidates:

- interactive HTML graph rendering
- community coloring
- graph report generation
- GraphML export
- optional shortest-path style exploration

Avoid:

- `graphify codex install`
- automatic `AGENTS.md` mutation
- `.codex/hooks.json` mutation
- re-mining the same repo/docs corpus in parallel with MemPalace

If we reuse code or ideas from `graphify`, prefer the export and rendering layer over its assistant-hook and ingestion workflow.

## Phase plan

### Phase 1

Status: implemented

- add a graph export adapter for MemPalace sidecars
- render a simple graph with rooms, entities, and projects
- expose build and open actions in Workspace Hub
- keep the feature explicitly target-scoped

### Phase 2

- enrich the adapter with conversation exports and wake-up summaries
- add bridge-node and centrality summaries
- support basic filtering by node type and confidence

### Phase 3

- support richer relationship extraction once MemPalace emits more structured entities
- add in-app graph embedding instead of open-file only
- add optional report-driven search suggestions from the graph

## Guardrails

- MemPalace remains the source of truth for memory
- tracked repo docs remain the source of truth for project guidance
- graph artifacts are derived views, not canonical records
- graph generation must stay workspace-safe and target-aware
- graph generation must not silently mutate repo agent configuration
- low-signal memory inputs should stay excluded by default

## Documentation impact

When this feature lands in code, update:

- `repos/workspace-hub/README.md`
- `docs/11-core-memory-and-reference-promotion.md`
- `docs/README.md`
- `docs/CHANGELOG.md`

This note is the planning and design reference for that slice.
