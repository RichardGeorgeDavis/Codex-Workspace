---
name: agent-tooling-doctor
description: Diagnose Codex, OMX, OpenCode, and repo-level agent setup inside the workspace
---

# Agent Tooling Doctor

Use this skill when the task is about Codex/OpenCode/OMX readiness, repo-local agent config, or conflicting setup layers.

## Default checks

1. Run `tools/scripts/doctor-agent-tooling.sh`.
2. Check for repo `AGENTS.md`, `.codex/skills/`, optional `.agents/skills/`, `.workspace/agent-stack.json`, `.opencode/`, and `.omx/`.
3. Prefer tracked repo guidance over hidden or user-only overrides when both exist.
4. If a reviewed upstream snapshot in `tools/ref/` suggests a useful improvement, extract it into the workspace baseline instead of depending on the snapshot itself.

## Workspace-native tools

```bash
tools/scripts/doctor-agent-tooling.sh
tools/scripts/init-agents-tree.sh --help
tools/scripts/sync-codex-skills.sh --all
tools/scripts/sync-reference-snapshots.sh --list
```

## Expected tracked layout

- repo rules: `AGENTS.md`
- Codex skills: `.codex/skills/`
- compatibility mirror: `.agents/skills/`
- tool-neutral agent hints: `.workspace/agent-stack.json`
- OpenCode project config: `.opencode/`

## Avoid

- vendoring full upstream harnesses into the workspace baseline
- letting local-only runtime state become the canonical project contract
