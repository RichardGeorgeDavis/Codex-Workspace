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

## Project-specific gotchas

- record recurring environment, package-manager, runtime or deployment traps
  here once they have been confirmed
- do not duplicate facts that are already derivable from the source or manifest

## Repeatable workflows

When asked to do a recurring task, follow the repo-specific workflow below.

- Add one short rule per recurring task, naming the trigger and the required
  workflow or command.
- Preserve any required order, approvals, rollback step and evidence boundary.

## Verification and definition of done

- list the repo's required test, build, lint or syntax commands here
- visual changes: inspect the rendered result at the relevant viewport sizes
- HTTP or integration changes: run a targeted local request when available
- if a check cannot run, report it and record the residual risk
- use the workspace `quality-gate` guidance for the completion standard and
  `docs/10-release-readiness.md` for workspace release changes

## Notes for agents

- check existing docs and manifests before inferring behavior
- prefer tracked repo guidance over user-only local state
- treat generated or local-only orchestration state as operational, not canonical
