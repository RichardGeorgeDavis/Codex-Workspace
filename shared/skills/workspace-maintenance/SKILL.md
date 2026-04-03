---
name: workspace-maintenance
description: Maintain the Codex Workspace safely across docs, scripts, caches, and repo-level conventions
---

# Workspace Maintenance

Use this skill when the task is about improving the workspace itself rather than a single child repo.

## Goal

Keep the workspace predictable, low-duplication, and easy for Codex or other local agents to navigate.

## Default workflow

1. Read [AGENTS.md](/Users/richard/Local%20Sites/Codex%20Workspace/AGENTS.md) and the relevant docs in [docs/](/Users/richard/Local%20Sites/Codex%20Workspace/docs).
2. Run `tools/scripts/doctor-workspace.sh` before changing shared setup assumptions.
3. Prefer workspace-native scripts and templates over ad hoc one-off layouts.
4. Keep repo installs local to each repo. Share caches, not installs.
5. When a reviewed reference appears in `tools/ref/`, extract the pattern into tracked workspace code, docs, templates, or skills rather than adding the reference as a dependency.

## Useful commands

```bash
tools/scripts/doctor-workspace.sh
tools/scripts/doctor-agent-tooling.sh
tools/scripts/setup-workspace-profile.sh --list
tools/scripts/sync-reference-snapshots.sh --list
tools/scripts/update-all.sh --list-groups
```

## Guardrails

- Do not make experimental orchestration layers mandatory for the whole workspace.
- Do not centralize dependencies across unrelated repos.
- Prefer small, inspectable tracked improvements over hidden runtime magic.
