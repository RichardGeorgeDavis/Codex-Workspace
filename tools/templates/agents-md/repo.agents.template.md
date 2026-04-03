# AGENTS.md

## Scope

These instructions apply to `__TITLE__` at `__RELATIVE_PATH__`.

## Local objective

Keep this repo aligned with Codex Workspace conventions while preserving its own runtime and package-manager rules.

## Default expectations

- keep the repo independently runnable
- prefer small, reviewable changes
- document non-obvious runtime behavior in `.workspace/project.json`
- put Codex-visible repo skills in `.codex/skills/`
- add `.agents/skills/` only when the repo also needs a tracked compatibility mirror
- put tool-neutral agent setup hints in `.workspace/agent-stack.json` when helpful

## Notes for agents

- check existing docs and manifests before inferring behavior
- prefer tracked repo guidance over user-only local state
- treat generated or local-only orchestration state as operational, not canonical
