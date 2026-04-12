---
title: Setup
status: draft
updated: 2026-04-12
---

# Setup

## Purpose
Explain how to prepare the local environment.

## Scope
Dependencies, installation, and local conventions for the Python CLI runtime.

## Dependencies
- Python 3.11+
- `PyYAML`
- `jsonschema`

Install locally from the repo root:

```bash
python3 -m pip install -e .
```

## Primary commands

```bash
python3 -m knowledge_palace.cli validate
python3 -m knowledge_palace.cli serve-ui
python3 -m knowledge_palace.cli intake --collection events --input <path> --event-slug <slug>
python3 -m knowledge_palace.cli normalize --manifest raw/events/<event-slug>/source-manifest.yaml
python3 -m knowledge_palace.cli segment --manifest raw/events/<event-slug>/source-manifest.yaml --source <source-id>
python3 -m knowledge_palace.cli distill --manifest processed/manifests/<event-slug>.yaml
python3 -m knowledge_palace.cli export --target markdown --manifest processed/manifests/<event-slug>.yaml
```

The `scripts/*.py` files remain as thin wrappers, but the module entrypoint is the canonical interface.

## Local UI
Start the UI with:

```bash
python3 -m knowledge_palace.cli serve-ui
```

Default address:

```text
http://127.0.0.1:8765
```

Use the UI for lightweight repo browsing, text-file editing, and running pipeline commands against the current event-first repo structure.

Workspace launcher:

```text
/Users/richard/Local Sites/Codex Workspace/tools/local/commands/Run Knowledge Palace UI.command
```

## Rules / constraints
- Keep source truth distinct from interpretation
- Prefer portable formats
- Update related files when behaviour changes

## Example
The checked-in event example uses:

- input: `examples/event-pack/briefing.md`
- raw manifest: `raw/events/design-indaba-2025/source-manifest.yaml`
- processed manifest: `processed/manifests/design-indaba-2025.yaml`
- distilled outputs: `cards/concepts/`, `cards/workflows/`, `graph/*.jsonl`
- export pack: `exports/markdown/design-indaba-2025/pack.md`

## Failure cases
- Missing provenance in claims, workflows, or cards
- Invalid IDs or slugs that break routing and linking
- Examples drifting away from schemas
- Assuming non-event collections are implemented in v1

## Related files
- `README.md`
- `handover.md`
