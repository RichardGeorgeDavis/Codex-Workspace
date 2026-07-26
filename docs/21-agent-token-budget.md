# 21-agent-token-budget

## Purpose

This note defines default context-loading limits for agents working in Codex
Workspace. The goal is to reduce token usage without hiding useful evidence.

## Default Read Path

For a fresh task, read in this order:

1. `AGENTS.md`
2. `docs/HANDOVER.md`
3. the relevant repo README, handover, manifest, or source files
4. generated `cache/context/.../entry.md` only when a compact side-load packet is useful

Do not load long historical logs just because they exist.

## Opt-In Paths

Open these only when the task specifically requires them:

- `docs/archive/`
- repo `ref/`
- repo `screenshots/`
- `cache/`
- generated reports
- copied site HTML
- archives such as `.zip`, `.tar.gz`, `.7z`
- lockfiles, vendor folders, and build output

When these paths are relevant, inspect targeted files or summarize counts first
instead of loading whole folders.

## Search Defaults

Use Workspace Hub indexed search in `thin` mode by default.

Hub archive files are hidden from default summary payloads. Load them only with
the explicit archived-items UI path or an `includeArchives=true` summary request.

Keep artifact indexing disabled unless needed:

```bash
WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS=false
```

Use deep search only for explicit investigation tasks where broad repo logs,
docs, or generated artifacts are likely to matter.

## Tool Profiles

For routine repo work, prefer the smallest supported MCP surface such as
`safe-readonly`.

Use heavier profiles such as `default-full` only when the current task needs
browser automation, GitHub operations, live documentation, or debugging tools.

## Side-Load Summaries

Generated context files under `cache/context/` are optional and disposable.

Prefer:

- `entry.md` for the first compact read
- `abstract.md` only when choosing whether a target is relevant
- `overview.md` when planning a broader slice
- `sources.json` when checking provenance

Do not read generated summaries and all canonical docs by default. If generated
summaries disagree with tracked docs or source files, trust the tracked source.

For bounded preparation, GPT may invoke the task-time local-first wrapper with
a named workspace, repo or explicit file set. This can reduce repeated source
loading: reuse exact provenance-matched packets, read `entry.md` or
`handover.md` first, and inspect `sources.json` only when provenance matters.
Ollama remains the private/default backend. Gemini API may run automatically
only for explicitly selected tracked public files; it is never a quota-driven,
private or client-data fallback. Do not broaden the selection merely because a
model suggests another path.

## Workspace Memory

No workspace memory runtime is installed by default. Use tracked docs and
optional side-load `entry.md` packets for closeout context.
