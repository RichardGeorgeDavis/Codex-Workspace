---
name: repo-onboarding
description: Onboard a repo into Codex Workspace with runtime metadata, AGENTS guidance, and agent-tooling conventions
---

# Repo Onboarding

Use this skill when adding a repo under `repos/` or making an existing repo workspace-ready.

## Checklist

1. Classify the repo conservatively from files first.
2. Add or refine `.workspace/project.json` only if runtime behavior is not obvious.
3. Ensure `README.md` exists. If it is missing, start from `tools/templates/repo-docs/README.template.md`.
4. Make sure the README explains setup, run, preview, and current repo purpose.
5. Add a repo-local cover block that points to a PNG path such as `docs/cover.png`, using the placeholder template until a real capture exists.
6. Add repo-level `AGENTS.md` only when repo-specific rules are genuinely needed.
7. If the repo needs Codex-visible capabilities, use `.codex/skills/`.
8. Add `.agents/skills/` only when the repo also benefits from a tracked compatibility mirror.
9. If the repo needs broader multi-tool agent hints, use `.workspace/agent-stack.json`.

## Helpful commands

```bash
tools/scripts/bootstrap-repo.sh
tools/scripts/init-agents-tree.sh repos/<repo>
tools/scripts/sync-codex-skills.sh repos/<repo>
```

## Good defaults

- Frontend-style repos default to `direct`.
- WordPress repos usually stay `external`.
- Agent tooling should be scaffolded as tracked files, not hidden state.
