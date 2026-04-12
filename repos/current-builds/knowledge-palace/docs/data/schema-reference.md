---
title: Schema Reference
status: draft
updated: 2026-04-12
---

# Schema Reference

## Purpose
Human-readable guide to object schemas.

## Scope
Field-by-field explanation for the v1 event-first object model.

## Core schemas

### `source.schema.json`
- Canonical raw-source object.
- Requires event routing fields, checksum, and preserved file path.
- Uses `src_<slug>` IDs and event-only `collection_type` in v1.

### `source-segment.schema.json`
- Evidence unit derived from cleaned text.
- Uses `seg_<source-slug>-NNN` IDs.
- Stores the segment body that later claims and workflows cite.

### `claim.schema.json`
- Minimal reusable assertion extracted from segmented material.
- Requires non-empty `source_refs`.
- Uses `clm_<event-slug>-<source-slug>-NNN` IDs.

### `workflow.schema.json`
- Reusable procedure or review loop distilled from a source.
- Requires non-empty `steps` and `source_refs`.
- Uses `wf_<event-slug>-<source-slug>-NNN` IDs.

### `knowledge-card.schema.json`
- Human-readable concept or event insight summary backed by provenance.
- Requires `source_refs`, `statement_types_present`, and a stable slug.
- Uses `card_<event-slug>-<source-slug>` IDs.

### `export-manifest.schema.json`
- Declares generated export files for one target and one event slug.
- Used for `markdown` and AI-target packs.

## ID and slug rules
- Slugs use lowercase kebab case only.
- Event-source IDs use the configured prefixes from `palace.config.yaml`.
- Validation rejects objects with missing provenance, invalid patterns, or missing files behind manifest references.

## Rules / constraints
- Keep source truth distinct from interpretation
- Prefer portable formats
- Update related files when behaviour changes

## Examples
- source example: `examples/event-pack/source-manifest.yaml`
- chat artefact example: `examples/chat-import/chat-artifact.json`
- generated event outputs: `raw/events/design-indaba-2025/`, `processed/manifests/design-indaba-2025.yaml`

## Failure cases
- Allowing free-form additional properties to hide contract drift
- Reusing source IDs across different files
- Writing claims or cards without valid segment references

## Related files
- `README.md`
- `handover.md`
