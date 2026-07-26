# 08-first-run-and-updates

## Purpose

This is the short first-run and update path for Codex Workspace. It is meant to be safe to read at the start of an agent session without pulling in the historical setup detail.

Detailed historical notes moved to `docs/archive/08-first-run-and-updates-history-2026-04.md` and should only be opened for targeted archaeology.

## Current Defaults

- Start with Workspace Hub for the concrete local control surface.
- Keep each repo independently runnable; never create one shared dependency install.
- Share caches under `cache/`, not dependency directories.
- Use generated `cache/context/**/entry.md` packets before broader generated summaries.
- Use Workspace Hub search in `Thin` mode first.
- Treat `Deep (slower)`, artifacts, screenshots, `ref/`, logs, failure reports, and archived docs as opt-in evidence.
- Record closeout in tracked docs; no workspace memory wrapper is installed.

## Fast Hub Trial

```bash
cd repos/workspace-hub
pnpm install
pnpm dev
```

Once the Hub is open:

1. Use Repo Discovery with `Thin` search first.
2. Open repo details only for the repo you are actively working on.
3. Use `Open entry packet` before abstract, overview, sources, logs, or artifacts.
4. Leave archive files hidden unless you explicitly need them.
5. Use tracked docs and optional generated context-cache summaries for closeout context.

## Fresh Agent Handover

For a cheaper repo-aware chat:

1. Read `docs/HANDOVER.md`.
2. Read the directly relevant tracked README or docs page.
3. Use `cache/context/**/entry.md` only when a compact generated side-load helps.
4. Open `abstract.md`, `overview.md`, `sources.json`, logs, screenshots, `ref/`, artifacts, and `docs/archive/` only when the task specifically needs that evidence.
5. Treat tracked docs, manifests, and repo files as canonical when they differ from generated summaries.

Suggested instruction:

> Read `docs/HANDOVER.md` first. Use generated `entry.md` files under `cache/context/` only as compact side-load packets, and avoid deep evidence paths unless the task requires them.

## Setup Profiles

### Core

Use this for the workspace structure, docs, and helper scripts.

Install or verify:

- `git`
- `rg`
- `jq`
- `fd`
- `tree`

### Hub

Use this for the local dashboard in `repos/workspace-hub/`.

Install or verify:

- Node.js 20+
- `pnpm` 9+
- a Chrome-compatible browser only if you need cover screenshots

### Mixed Stack

Use this only when sibling repos need these tools:

- `python3`, `pip`, optional `uv`
- `composer`
- `wp`

### WordPress

Use Local or mapped-host tooling only for repos that benefit from it. Do not make either mandatory for the whole workspace.

### Agent Enhanced

Use tracked `.codex/skills/` and selected optional MCP integrations only when they reduce repeated work. For token-sensitive routine repo work, prefer the smallest supported MCP surface, such as the `safe-readonly` profile. Use heavier profiles like `default-full` only when browser, GitHub, docs, or debugging tools are actually needed.

## Update Path

For ordinary workspace updates:

```bash
git pull --ff-only
tools/scripts/bootstrap-workspace.sh
tools/scripts/doctor-workspace.sh
```

For Workspace Hub:

```bash
pnpm --dir repos/workspace-hub install
pnpm --dir repos/workspace-hub typecheck
pnpm --dir repos/workspace-hub test
```

For context side-load refreshes:

```bash
tools/scripts/generate-context-cache.sh --workspace --run
tools/scripts/generate-context-cache.sh --repo workspace-hub --run
```

For MCP profile checks:

```bash
tools/scripts/install-mcp-profile.sh safe-readonly
tools/scripts/check-mcp-health.sh --profile safe-readonly
```

Use `default-full` instead only when the current task needs the broader tool surface.

## Capability And Reference Updates

Use the managed wrappers rather than updating reviewed sources by hand:

```bash
tools/scripts/manage-workspace-capabilities.sh list
tools/scripts/manage-workspace-capabilities.sh install
tools/scripts/manage-workspace-capabilities.sh update
tools/scripts/update-github-refs.sh --list
```

Most commands are dry-run by default. Add `--run` only when you intend to apply the change.

## What To Avoid

- Mandatory global installs.
- One dependency tree shared by unrelated repos.
- Reading archived docs or generated evidence by default.
- Adding background memory tooling without a separate review.
- Making browser, GitHub, or deep-search tooling part of every routine session.
