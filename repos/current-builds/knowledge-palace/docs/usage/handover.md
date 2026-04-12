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
- The current unattended-friendly resume commands are `python3 -m knowledge_palace.cli validate` and `python3 -m knowledge_palace.cli serve-ui`.

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
- Batch 1: UI file creation and upload flows. Recommended reasoning effort: `high`.
- Batch 2: manifest-aware structured editors. Recommended reasoning effort: `medium`.
- Batch 3: provenance explorer views. Recommended reasoning effort: `medium`.
- Batch 4: normalization and distillation quality improvements. Recommended reasoning effort: `medium`.
- Batch 5: expansion beyond events only after the earlier batches stabilize. Recommended reasoning effort: `medium`.

## AFK rule
- Run one batch at a time, and require code, tests, docs, and handover to land together before moving to the next batch.

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
