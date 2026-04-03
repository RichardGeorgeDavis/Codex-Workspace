# OpenCode Setup

Use these starter files when a repo in Codex Workspace should be friendlier to OpenCode or `oh-my-openagent` without making either tool a workspace-wide dependency.

Recommended tracked layout inside a repo:

```text
repo/
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   └── skills/
├── .agents/skills/
├── .workspace/agent-stack.json
├── .workspace/agent-artifacts/
└── .opencode/
    ├── opencode.jsonc
    └── oh-my-openagent.jsonc
```

Guidance:

- keep repo instructions in tracked `AGENTS.md`
- keep official Codex repo-local skills in `.codex/skills/`
- keep `.agents/skills/` only when the repo also benefits from a tracked compatibility mirror
- use `.workspace/agent-stack.json` as the tool-neutral contract for agent setup hints
- keep lightweight agent notes or job artifacts under `.workspace/agent-artifacts/` instead of importing a full runtime harness into the base repo
- use `.opencode/` only when the repo intentionally supports OpenCode-style tooling
- do not make OpenCode or `oh-my-openagent` a hard requirement for unrelated repos
- upstream is still in a rename transition: the OpenCode plugin entry prefers `oh-my-openagent`, while the published package, binary, and schema file still commonly use `oh-my-opencode`
