# MemPalace Shared State

This folder holds durable per-user MemPalace data for Codex Workspace.

Use this layout:

```text
shared/mempalace/<user>/
├── exports/
│   └── codex/
└── home/
    └── .mempalace/
```

MemPalace commands in this workspace set `HOME` to the user-specific `home/` folder so the service keeps its long-term memory here instead of writing to the real machine home directory.

Readable Codex transcript exports created by `tools/bin/workspace-memory export-codex` or `mine-codex-current` should live under `shared/mempalace/<user>/exports/codex/`.

Tracked docs remain the source of truth for project guidance. This folder is for durable local memory and service state.
