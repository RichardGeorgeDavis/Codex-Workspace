---
name: "quality-gate"
description: "Use when a task needs explicit verification criteria before work is considered complete."
---

# Quality Gate

Use this skill when the task needs a visible definition of done instead of informal confidence.

## Intent

Make completion criteria explicit before or during implementation so verification is cheaper and less subjective.

## Recommended mode handling

- `fast`: verify the critical path only
- `standard`: verify the normal user path plus obvious regressions
- `strict`: verify edge cases, regressions, and failure handling before treating the work as complete

## Working rules

1. State what must be true for the task to count as done.
2. Prefer observable checks over vague confidence.
3. Distinguish required verification from optional nice-to-have checks.
4. If a check cannot be run, say so explicitly and state the residual risk.

## Output shape

Use a compact structure such as:

- scope
- required checks
- checks completed
- checks skipped
- residual risks

## Good fits

- release preparation
- refactors with regression risk
- security-sensitive changes
- migration work
- tasks where multiple contributors need the same definition of done
