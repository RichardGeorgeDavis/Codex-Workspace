---
title: Handover
status: draft
updated: 2026-04-12
---

# Handover

## Purpose
Explain how future sessions should continue work.

## Scope
Session continuity, current state, next steps, and update rules.

## Current state
- Knowledge Palace now has a working event-first Python CLI and a lightweight local web UI.
- The canonical runtime entrypoint is `python3 -m knowledge_palace.cli`.
- The canonical UI launcher is `tools/local/commands/Run Knowledge Palace UI.command`.
- The current proven example path is the Design Indaba event pack.

## Resume points
- Use `handover.md` at the repo root for the authoritative current build summary.
- Use `CHANGELOG.md` for landed slices.
- Use `README.md` and `docs/operations/setup.md` for the current runtime and launcher path.

## Rules / constraints
- Keep source truth distinct from interpretation
- Prefer portable formats
- Update related files when behaviour changes
- Keep the UI thin over the CLI contract instead of adding duplicate backend logic

## Next steps
- Add UI file creation and upload flows
- Add manifest-aware structured editors
- Add provenance explorer views
- Improve normalization and distillation quality before broadening collection support

## Example
- Start from `tools/local/commands/Run Knowledge Palace UI.command` when a future session should resume from the UI rather than the shell.

## Failure cases
- Missing provenance
- Blended source and reflection
- Unclear object typing
- Outdated examples not matching schemas
- UI and CLI behavior drifting apart

## Related files
- `README.md`
- `handover.md`
- `CHANGELOG.md`
