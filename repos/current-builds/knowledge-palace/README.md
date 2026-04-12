# Knowledge Palace

A repo-native, provenance-first personal knowledge operating system.

## What this is
Knowledge Palace is a structured repository for preserving source material, extracting reusable knowledge, capturing thinking and critique, and exporting context packs for AI tools without losing provenance.

## Core position
- The **repo is the system of record**
- External tools are **inputs, processing surfaces, or export targets**
- Source truth, inference, reflection, and AI synthesis are stored separately

## Primary use cases
- Event knowledge packs
- Course knowledge packs
- Person / creator collections
- AI conversation ingestion
- NotebookLM harvest and re-ingestion

## Core layers
1. Intake
2. Source Vault
3. Processing
4. Distillation
5. Linking
6. Exports

## Runtime
This repo now runs as a small Python CLI with repo-local dependencies.

Install locally:

```bash
python3 -m pip install -e .
```

Canonical entrypoint:

```bash
python3 -m knowledge_palace.cli validate
```

Local UI:

```bash
python3 -m knowledge_palace.cli serve-ui
```

Then open `http://127.0.0.1:8765`.

Workspace launcher:

```text
tools/local/commands/Run Knowledge Palace UI.command
```

## Quick start
1. Ingest an event source:

```bash
python3 -m knowledge_palace.cli intake --collection events --input examples/event-pack/briefing.md --event-slug design-indaba-2025 --title "Design Indaba 2025 example pack"
```

2. Normalize the raw manifest:

```bash
python3 -m knowledge_palace.cli normalize --manifest raw/events/design-indaba-2025/source-manifest.yaml
```

3. Segment the normalized source:

```bash
python3 -m knowledge_palace.cli segment --manifest raw/events/design-indaba-2025/source-manifest.yaml --source src_briefing
```

4. Distill claims, workflows, and cards:

```bash
python3 -m knowledge_palace.cli distill --manifest processed/manifests/design-indaba-2025.yaml
```

5. Export a pack:

```bash
python3 -m knowledge_palace.cli export --target markdown --manifest processed/manifests/design-indaba-2025.yaml
```

6. Validate the repo contracts:

```bash
python3 -m knowledge_palace.cli validate
```

## Local UI
The repo includes a lightweight local web UI for file browsing and editing.

Current UI scope:
- browse the repo tree
- open and edit Markdown, YAML, JSON, CSV, and Python files
- save changes back into the repo
- trigger `validate`, `normalize`, `segment`, `distill`, and `export` against the current selection

Current UI limits:
- no file upload flow yet
- no rich diffing or conflict handling
- `export` from the UI currently targets `markdown`
- actions assume the event-first v1 layout

## Where We Are
- Event-first v1 engine is working end to end.
- The local web UI is now available both from the CLI and from the workspace launcher command.
- The proven reference flow remains `examples/event-pack/briefing.md` through raw, processed, distilled, and exported artefacts.
- The UI is intentionally thin: it edits files and triggers the same CLI actions rather than reimplementing pipeline logic.

## Next Steps
- Add file creation and upload flows in the UI.
- Add manifest-aware forms for common YAML and JSON documents.
- Add provenance views across source, segment, claim, workflow, and card.
- Improve normalization and distillation quality before expanding beyond events.

## Current status
This repo is now a **working v1 event pipeline** built from the original Phase 1 scaffold generated on 2026-04-12. It includes:
- a repo-native Python CLI
- stricter schemas for the event-first contract
- validation across examples and generated artefacts
- a checked-in end-to-end event example
- markdown and AI-target export support through one common pack generator

## Folder overview
See `docs/strategy/architecture.md` and `handover.md`.

## Next build priorities
- Improve non-Markdown normalization and segmentation quality
- Expand from `events` to `courses`, `people`, and chat ingestion
- Add stronger entity/linking logic on top of the current graph outputs
- Broaden export formatting once the core object model stays stable
