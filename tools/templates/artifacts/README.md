# Artifact Templates

This folder documents the recommended local artifact bundle for longer-running agent jobs.

Use this when you want task state to survive beyond one chat turn without turning the workspace into a full agent platform.

## Recommended bundle

```text
cache/context/agents/jobs/<job-id>/
├── audit.jsonl
├── plan.md
├── summary.md
├── sources.json
├── logs/
├── screenshots/
└── outputs/
```

Recommended usage:

- `audit.jsonl` for a local tamper-evident event log seed
- `plan.md` for the working plan and scoped risks
- `summary.md` for final outcome and verification notes
- `sources.json` for the files that informed the work
- `logs/` for command output snapshots or exported reports
- `screenshots/` for UI or rendered evidence
- `outputs/` for generated artifacts worth keeping locally

Use `tools/scripts/init-agent-job-bundle.sh` to create this layout under `cache/context/agents/jobs/`.

Keep these bundles local cache by default unless a specific artifact should be promoted into tracked docs.
