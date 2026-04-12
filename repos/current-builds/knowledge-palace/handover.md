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
- Clean resume commands:
  `python3 -m knowledge_palace.cli validate`
  `python3 -m knowledge_palace.cli serve-ui`

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

## Next batches
1. Batch 1 — UI create/upload flows
   Reasoning effort: `high`
   Outcome: create new files from the UI, upload event source files into the repo, and route them safely into the event-first flow.
   Likely surfaces: `knowledge_palace/webapp.py`, `knowledge_palace/cli.py`, docs, tests.
   Acceptance: a user can create a new Markdown/YAML/JSON file from the browser, upload a source file, and still pass `python3 -m unittest discover -s tests -v` and `python3 -m knowledge_palace.cli validate`.
2. Batch 2 — Manifest-aware editors
   Reasoning effort: `medium`
   Outcome: structured forms for `source-manifest.yaml`, processed manifests, and export manifests instead of raw text-only editing.
   Likely surfaces: web UI rendering/actions, schema-aware helpers, tests, setup docs.
   Acceptance: common manifest edits can be completed in the UI without hand-editing YAML structure, and saved output still validates.
3. Batch 3 — Provenance explorer
   Reasoning effort: `medium`
   Outcome: UI views that traverse source -> segment -> claim -> workflow -> card using the current generated files.
   Likely surfaces: web UI read APIs, graph/card readers, tests, handover/docs.
   Acceptance: selecting an event manifest or card shows linked provenance objects without needing to inspect files manually.
4. Batch 4 — Better normalization/distillation
   Reasoning effort: `medium`
   Outcome: cleaner Markdown/text normalization and more useful deterministic distillation outputs.
   Likely surfaces: `knowledge_palace/pipeline.py`, example outputs, tests, changelog.
   Acceptance: the Design Indaba example generates cleaner claims/cards than the current bullet-collapsed summaries and still validates.
5. Batch 5 — Expand beyond events
   Reasoning effort: `medium`
   Outcome: add the next collection type only after the event-first path and UI have stabilized.
   Preferred order: `courses`, then `people`, then `chat`.
   Acceptance: the new collection gets the same minimum bar of schema contract, worked example, validation, docs, and UI compatibility.

## AFK operating notes
- Keep each batch end-to-end: code, tests, docs, and handover in one slice.
- Prefer `medium` by default and reserve `high` for batches that change interfaces or backend/frontend contracts.
- Do not broaden collection support and UI architecture in the same unattended batch.
- Use Lokus only as a UX reference, not as an implementation dependency, unless license and runtime tradeoffs are re-evaluated explicitly.
