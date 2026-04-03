# Codex Setup

Use these starter files when a repo in Codex Workspace should expose official Codex repo-local surfaces without relying only on workspace-specific compatibility paths.

Recommended tracked layout inside a repo:

```text
repo/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   └── skills/
└── .agents/skills/
```

Guidance:

- keep durable repo guidance in tracked `AGENTS.md`
- use `.codex/skills/` for official Codex repo-local skills
- keep `.agents/skills/` when the repo also needs workspace-native compatibility with other local agent tooling
- keep `.codex/config.toml` minimal; prefer instructions and skills over per-repo model or sandbox churn
- treat `openai/codex` as the reviewed upstream reference for official CLI and `.codex/` conventions, not as something to vendor into this workspace
