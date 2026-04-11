---
name: runtime-triage
description: Diagnose preview, install, and runtime issues in Workspace Hub and sibling repos
---

# Runtime Triage

Use this skill when a repo in the workspace fails to install, start, preview, or report health correctly.

## Triage flow

1. Inspect the repo in Workspace Hub first for runtime, install, health, and manifest state.
2. Open the latest failure report if one exists.
3. Check `.workspace/project.json` for explicit overrides before changing inference logic.
4. Verify runtime commands directly in the repo only after reading the tracked metadata and logs.
5. Promote repeat fixes into docs, manifests, scripts, or skills.

## Useful locations

- [repos/workspace-hub/docs/runtime-troubleshooting.md](/Users/richard/Local%20Sites/Codex%20Workspace/repos/workspace-hub/docs/runtime-troubleshooting.md)
- [repos/workspace-hub/data/](/Users/richard/Local%20Sites/Codex%20Workspace/repos/workspace-hub/data)
- [cache/context/agents/jobs/](/Users/richard/Local%20Sites/Codex%20Workspace/cache/context/agents/jobs)

## Guardrails

- Do not hard-code one package manager across all repos.
- Do not switch a repo into a proxy or mapped-host preview mode unless it solves a real problem.
