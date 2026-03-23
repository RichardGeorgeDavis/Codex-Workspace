---
name: "typescript-review"
description: "Use when reviewing TypeScript changes that need attention to typing, runtime behavior, and verification."
---

# TypeScript Review

Use this skill when a TypeScript change needs structured review rather than a generic pass.

## Focus areas

- type safety versus runtime reality
- API and schema drift
- async error paths
- build and lint impact
- test coverage for behavior changes

## Recommended mode handling

- `fast`: review changed code paths and obvious type/runtime mismatches
- `standard`: review impacted call sites, validation, and tests
- `strict`: review edge cases, migrations, contracts, and likely regression surfaces

## Review prompts

Ask:

- can the runtime value violate the static type assumption?
- are errors surfaced, swallowed, or rethrown consistently?
- did a public contract change without matching validation or tests?
- does the change rely on unsafe casts, optional values, or implicit coercion?

## Output shape

Prefer:

- findings first
- open questions second
- change summary last
