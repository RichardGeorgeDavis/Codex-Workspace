# Docs closeout: handover status + README refresh

Tracked copy of the implementation plan (for Codex or future sessions). Executed 2026-04-11; see `docs/CHANGELOG.md` for the applied slice.

## Summary

1. **Handover:** Batches 1–4 complete; v1.2.1 baseline. Optional follow-ons: MCP profiles, Hub memory-graph Phase 2, capability drill-down, repo-intake polish. Completion review open themes: diagnostics, favourites, dependency feedback, mapped-host preview polish, runtime troubleshooting docs.
2. **Docs/wiki review:** Align `docs/` and `docs/wiki/` with HANDOVER/CHANGELOG; reduce duplicate prose; keep wiki navigational.
3. **Remove ServBay product naming** from docs and user-facing surfaces; use neutral language (optional reverse proxy, mapped host). Stable JSON keys `servbay`, `servbayPath`, `servbaySubdomain` remain documented as stable manifest values.
4. **README:** Multi-agent intro, Workspace Hub section + cover placement, **What's included (and why)** table.
5. **Public surfaces:** `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, `docs/HANDOVER.md`, `repos/workspace-hub/README.md` / manifest docs when relevant.

## Codex prompt (reuse)

```text
Execute the docs closeout plan in docs/plans/readme-docs-closeout.md. Goals: (0) Review docs/ and docs/wiki/ for accuracy vs HANDOVER/CHANGELOG, de-duplicate index vs wiki, and trim bloat/stale narrative. (1) Remove ServBay naming from workspace Markdown and contributor-facing templates; use neutral language for optional proxy/mapped-host tooling and WordPress via Local. (2) Update root README: add multi-agent positioning (Codex/Cursor/Claude), move the Workspace Hub cover block to sit with the Workspace Hub section, add a clear “What’s included and why” section, remove ServBay lines. (3) Update docs/HANDOVER.md completion review to drop ServBay polish and stay accurate; tighten addendum if it duplicates resolved CHANGELOG items. (4) Add a CHANGELOG entry and align docs/README.md. (5) For workspace-hub, update README/docs only unless we explicitly rename manifest API keys—if code still exposes servbay fields, document generically. Finish with git status; if the user asked for a handover update, run the appropriate workspace-memory closeout per AGENTS.md.
```
