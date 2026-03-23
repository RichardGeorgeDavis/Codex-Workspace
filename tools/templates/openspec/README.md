# OpenSpec Templates

This folder holds lightweight starter material for using OpenSpec-style tracked specs in a repo or workspace.

Use this layer when a change is large enough that requirements, design decisions, and implementation tasks should survive beyond one chat session.

Recommended tracked layout:

```text
openspec/
├── specs/
│   └── <capability>/
│       └── spec.md
└── changes/
    └── <change-id>/
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

Recommended usage:

- keep durable capability requirements under `openspec/specs/`
- use `openspec/changes/` for work-in-progress change proposals and implementation breakdowns
- reserve this for larger or riskier work, not every small edit
- keep the final source of truth in tracked specs and code, not in chat history alone

These templates are intentionally generic. They are meant to complement OpenSpec, not replace its official tooling.
