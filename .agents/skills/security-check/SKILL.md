---
name: "security-check"
description: "Use when a task touches auth, secrets, permissions, unsafe input, shell execution, or other obvious security boundaries."
---

# Security Check

Use this skill when a task crosses a security boundary and needs a deliberate review instead of incidental caution.

## Trigger examples

- auth or session changes
- secrets or credentials
- shell execution
- file upload or file parsing
- untrusted input
- permissions or role checks
- dependency or supply-chain changes

## Recommended mode handling

- `fast`: review the highest-risk boundary only
- `standard`: review direct inputs, outputs, and permission checks
- `strict`: review trust boundaries, abuse cases, and operational fallout

## Working rules

1. Identify the trust boundary first.
2. Name the dangerous input or capability explicitly.
3. Check whether the current design narrows or expands the attack surface.
4. Prefer specific findings and mitigations over generic security language.
5. If no issue is found, still note the reviewed boundary and residual assumptions.

## Output shape

Use a compact structure such as:

- boundary reviewed
- main risks
- mitigations present
- gaps found
- follow-up checks

## Non-goal

Do not turn every task into a full audit. Use this when the boundary justifies it.
