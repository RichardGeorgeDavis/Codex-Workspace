# 20-ai-context-side-load

## Purpose

This note defines the concrete v1 side-load layer for Codex Workspace.

The goal is to make the existing layered context model operational by generating small, disposable `L0` and `L1` summaries under `cache/context/` without changing the canonical source-of-truth rule.

This note is implementation-specific. It does not replace [07-context-cache-and-retrieval.md](07-context-cache-and-retrieval.md).

## Scope

V1 covers:

- workspace-level summaries
- one repo-level summary target: `workspace-hub`
- provenance metadata in `sources.json`
- a dry-run-first generator script
- one Workspace Hub read path for repo-detail side-load freshness and file-open actions

V1 does not cover:

- tracked side-load files
- automatic regeneration during bootstrap or release checks
- task-bundle generation
- summary writes from Workspace Hub
- broad per-repo rollout across every repo in `repos/`

## Canonical versus generated context

The split stays explicit:

- tracked docs, manifests, and repo files remain canonical
- generated side-load files under `cache/context/` are disposable working summaries

If generated summaries disagree with tracked repo truth, regenerate or ignore the cache.

## Generated layout

V1 generates only these paths:

```text
cache/context/
├── workspace/
│   ├── abstract.md
│   ├── entry.md
│   ├── overview.md
│   └── sources.json
└── repos/
    └── workspace-hub/
        ├── abstract.md
        ├── entry.md
        ├── overview.md
        └── sources.json
```

Agent-job bundles under `cache/context/agents/jobs/` remain a separate local artifact path created by `tools/scripts/init-agent-job-bundle.sh`.

## Generator

Use:

```bash
tools/scripts/generate-context-cache.sh --workspace
tools/scripts/generate-context-cache.sh --workspace --print
tools/scripts/generate-context-cache.sh --workspace --run
tools/scripts/generate-context-cache.sh --repo workspace-hub --run
```

Behavior:

- dry-run by default
- `--print` shows the generated content on stdout
- `--run` writes files into `cache/context/`
- `--repo <name>` resolves a repo name under `repos/` and rejects unsafe path input

## Chat handover protocol

Use this when starting a fresh chat that needs repo-aware handover context.

Recommended sequence:

1. treat tracked docs as canonical and start with the relevant side-load entry packet
2. refresh the side-load cache if the session is broad, new, or likely to re-read workspace context repeatedly
3. let the chat use generated `entry.md`, `abstract.md`, and `overview.md` as the fast entry layer
4. fall back to tracked docs, manifests, and repo files for any real decision or ambiguity
5. regenerate or ignore the cache if Workspace Hub reports the side-load state as `stale` or `missing`
6. if a repo intake just created or updated setup docs, close the repo into the current Codex thread with `tools/bin/workspace-memory save-repo <repo-path-or-name>` before continuing

Practical operator flow:

```bash
tools/scripts/generate-context-cache.sh --workspace --run
tools/scripts/generate-context-cache.sh --repo workspace-hub --run
```

Then start the chat with a handover instruction such as:

> Read `docs/HANDOVER.md` first for the current workspace state. Use generated side-load files under `cache/context/` only as a compact entry layer, and treat tracked docs and repo files as canonical.

For repo-specific work, point the chat at the repo `entry.md` first, then the repo README or handover note only when the side-load packet is insufficient.

When a new repo folder was just added under `repos/`, use this order:

1. run repo intake in Workspace Hub or the equivalent repo-doc setup flow
2. make sure the repo has a runnable launcher command file
3. close the repo into memory with `tools/bin/workspace-memory save-repo <repo-path-or-name>`
4. reopen the generated repo `entry.md` if you want the compact chat packet before deeper docs

## Source set

### Workspace

- `README.md`
- `AGENTS.md`
- `docs/07-context-cache-and-retrieval.md`
- `docs/08-first-run-and-updates.md`
- `docs/09-new-repo-baseline.md`
- `repos/workspace-hub/README.md`

### Repo: `workspace-hub`

- `repos/workspace-hub/README.md`
- optional `repos/workspace-hub/AGENTS.md`
- optional `repos/workspace-hub/.workspace/project.json`

## Summary contracts

### `abstract.md`

Use this as the `L0` entry check.

It should stay small enough for quick relevance decisions and answer:

- what this workspace or repo is
- what kind of surface it is
- the main runtime or entrypoint
- the main constraint or warning

### `entry.md`

Use this as the default repo-scoped routing packet.

It should stay compact enough to answer:

- what to open first
- repo type and runtime mode
- the main commands
- the primary canonical docs
- the main constraints that should prevent broad workspace loading

### `overview.md`

Use this as the `L1` planning summary.

It should stay compact enough for planning and answer:

- major directories or surfaces
- main commands
- runtime assumptions
- main rules
- next canonical docs to open when more detail is needed

## Provenance contract

Each `sources.json` file uses this structure:

```json
{
  "version": 1,
  "scope": "workspace",
  "target": "workspace",
  "generatedAt": "2026-04-10T12:00:00Z",
  "generator": {
    "path": "tools/scripts/generate-context-cache.sh"
  },
  "inputs": [
    {
      "path": "README.md",
      "role": "workspace-readme",
      "bytes": 14786,
      "mtimeMs": 1775858522000.0,
      "sha256": "..."
    }
  ],
  "outputs": [
    {
      "path": "cache/context/workspace/abstract.md",
      "role": "abstract"
    }
  ]
}
```

Rules:

- `sha256` is stored for provenance and debugging
- freshness checks compare current file existence and recorded `mtimeMs`
- output freshness depends on `abstract.md`, `overview.md`, and `sources.json` all existing

## Workspace Hub behavior

Workspace Hub consumes repo side-load data only during repo-detail hydration.

It does not load side-load metadata during the base-summary discovery path.

The details panel should show:

- `missing` when no valid repo side-load cache exists
- `fresh` when all declared inputs still exist, `mtimeMs` values still match, and required outputs exist
- `stale` when an input changed or disappeared, or a required output file is missing

The Hub can open the generated `entry.md`, `abstract.md`, `overview.md`, and `sources.json` files directly through the existing generic open-path route.

## Practical rule

Use the side-load layer to reduce repeated high-signal doc loading, not to replace tracked workspace guidance.
