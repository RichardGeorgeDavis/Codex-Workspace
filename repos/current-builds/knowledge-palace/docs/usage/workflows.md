---
title: Workflows
status: draft
updated: 2026-04-12
---

# Workflows

## Purpose
Explain common end-to-end operating flows.

## Scope
Human and AI usage patterns for the event-first v1 pipeline.

## Canonical workflow
1. Place or identify a source file for an event.
2. Run `intake` to preserve the original under `raw/events/<event-slug>/...` and write `source-manifest.yaml`.
3. Run `normalize` to produce cleaned text and a processed manifest.
4. Run `segment` for each source that should become a reusable evidence unit.
5. Run `distill` to create claims, workflows, and knowledge cards with provenance.
6. Run `export` to generate downstream packs, starting with `markdown`.

## UI-assisted workflow
1. Start `python3 -m knowledge_palace.cli serve-ui` or use `tools/local/commands/Run Knowledge Palace UI.command`.
2. Open `http://127.0.0.1:8765`.
3. Browse to source manifests, processed manifests, cards, or exports.
4. Edit Markdown, YAML, or JSON files directly in the browser.
5. Run repo actions from the right-hand action panel against the selected manifest or source file.

## Current state
- The UI supports local browsing and editing for text-like repo files.
- The UI can trigger `validate`, `normalize`, `segment`, `distill`, and `export`.
- The current action assumptions are event-first and manifest-driven.

## Next state
- Add file creation and source upload actions.
- Add safer action targeting for multiple sources per event.
- Add provenance-first navigation across generated objects.

## Stable v1 artefacts
- Raw event manifest: `raw/events/<event-slug>/source-manifest.yaml`
- Processed manifest: `processed/manifests/<event-slug>.yaml`
- Segments: `processed/segments/<event-slug>/<source-slug>.json`
- Knowledge cards: `cards/concepts/<event-slug>-<source-slug>.json`
- Workflow cards: `cards/workflows/<event-slug>-<source-slug>.json`
- Graph rows: `graph/claims.jsonl`, `graph/workflows.jsonl`
- Exports: `exports/<target>/<event-slug>/`

## Rules / constraints
- Keep source truth distinct from interpretation
- Prefer portable formats
- Update related files when behaviour changes

## Example

```bash
python3 -m knowledge_palace.cli normalize --manifest raw/events/design-indaba-2025/source-manifest.yaml
python3 -m knowledge_palace.cli segment --manifest raw/events/design-indaba-2025/source-manifest.yaml --source src_briefing
python3 -m knowledge_palace.cli distill --manifest processed/manifests/design-indaba-2025.yaml
python3 -m knowledge_palace.cli export --target markdown --manifest processed/manifests/design-indaba-2025.yaml
```

## Failure cases
- Running export before segmentation or distillation has produced source-backed objects
- Treating generated cards as facts without tracing their `source_refs`
- Mixing chat or course data into the event path before those contracts exist
- Expecting the UI to replace the CLI contract layer; it is a thin operator surface over the same commands

## Related files
- `README.md`
- `handover.md`
