# Changelog

## 0.2.0 - 2026-04-12
- Added a repo-native Python package and CLI runtime under `knowledge_palace/`
- Implemented the event-first v1 pipeline: `intake`, `normalize`, `segment`, `distill`, and `export`
- Tightened core schemas for sources, segments, claims, workflows, cards, chat artefacts, and export manifests
- Replaced script stubs with working CLI wrappers or explicit v1 deferrals
- Expanded validation to cover schemas, examples, routing, manifests, generated cards, graph JSONL, and export manifests
- Added a checked-in Design Indaba event example with raw, processed, distilled, and exported artefacts
- Added automated tests covering validation, routing, processed manifest generation, and event export generation
- Updated README, setup, workflow, schema-reference, and handover docs to match the working runtime
- Added a lightweight local web UI for file browsing, text editing, and running event-first pipeline actions
- Added a workspace launcher command at `tools/local/commands/Run Knowledge Palace UI.command`

## 0.1.0 - 2026-04-12
- Created initial scaffold from master blueprint
- Added documentation starter pack
- Added schema stubs
- Added prompt library
- Added script stubs
- Added example content
- Added NotebookLM harvest example
