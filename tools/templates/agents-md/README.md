# AGENTS.md Composition Templates

This folder documents an optional composition path for larger `AGENTS.md` files.

Use this only when a single handwritten `AGENTS.md` becomes too large or repetitive to manage cleanly.

## Recommendation

If you use an `AGENTS.md` composition tool, keep these rules:

- the committed `AGENTS.md` file remains the canonical output
- composition tooling should be optional, not required for normal repo runtime
- fragments should stay close to the repo areas they describe
- durable guidance belongs in tracked files, not only in generated output

## Suggested fragment layout

```text
docs/agents/
├── overview.md
├── testing.md
└── release.md
```

Then compose those fragments into the repo-root `AGENTS.md`.

## Why this stays optional

This workspace already supports plain tracked `AGENTS.md` files well.

Composition is only a scaling aid. It should not become another mandatory toolchain layer for every repo.
