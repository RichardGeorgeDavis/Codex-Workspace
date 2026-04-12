# Handover

## Project
Knowledge Palace

## Objective
Build a repo-native, provenance-first personal knowledge system that stores sources, derived knowledge, thinking, workflows, and AI-generated artefacts in a portable structure.

## Current status
Event-first v1 runtime completed on 2026-04-12.

## Included in this build
- repo-native Python CLI under `knowledge_palace/`
- stricter event-first schemas
- validation that checks examples and generated artefacts
- working intake -> normalize -> segment -> distill -> export flow for events
- a checked-in Design Indaba example pack
- automated tests for validation and the event pipeline
- lightweight local web UI plus a workspace launcher command

## Current reference point
- Canonical runtime: `python3 -m knowledge_palace.cli`
- Verified commands: `validate`, `intake`, `normalize`, `segment`, `distill`, `export`, `serve-ui`
- First proven path: `examples/event-pack/briefing.md` -> `raw/events/design-indaba-2025/` -> `processed/manifests/design-indaba-2025.yaml` -> `cards/` + `graph/` + `exports/`
- Working export targets in practice: `markdown`, `codex`
- Changelog checkpoint: `CHANGELOG.md` now records the event-first runtime as `0.2.0`
- UI surface: lightweight local browser UI at `http://127.0.0.1:8765` for repo browsing, editing, and action triggering
- Workspace launcher: `tools/local/commands/Run Knowledge Palace UI.command`

## Confirmed positions
- The repo is the memory
- NotebookLM is a processing workbench, not the canonical store
- Antigravity, ChatGPT, Codex, Cursor, Gemini are inputs or operators, not the final archive
- Source truth, reflection, and AI synthesis must remain typed and distinct

## Constraints and preferences
- portable formats first
- explicit provenance
- originals preserved alongside derivatives where needed
- future chats should write only into predefined paths unless the blueprint changes

## Immediate next steps
1. Add a lightweight repo-native UI phase for browsing and editing Markdown, YAML, and JSON files
2. Use Lokus as a UX reference, not as a direct code dependency, unless its license and stack tradeoffs are explicitly accepted
3. Add file creation, upload, and manifest-aware forms so the UI is useful without dropping back to raw text editing for every operation
4. Add provenance views across source, segment, claim, workflow, and card
5. Improve non-Markdown normalization and segmentation quality
6. Add richer distillation heuristics beyond the current deterministic extraction
7. Expand the same contract discipline to course and person packs
8. Add chat ingestion once the event object model stops moving
