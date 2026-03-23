# Skills Templates

This folder holds starter material for tracked workspace or repo skills.

The current template structure reflects a few useful ideas from larger harness projects without adopting their full runtime model:

- install or publish only the packs you actually need
- keep common packs separate from language-specific packs
- keep quality and security guidance as optional reusable skills
- keep execution modes explicit instead of hidden in prompt drift

## Recommended pack layout

```text
tools/templates/skills/
├── README.md
├── install-profile.example.json
├── common/
│   ├── quality-gate/
│   │   └── SKILL.md
│   └── security-check/
│       └── SKILL.md
└── typescript/
    └── review/
        └── SKILL.md
```

Use `common/` for reusable skills that apply across many repos.

Use language folders such as `typescript/`, `python/`, or `php/` only when a repo or workspace actually needs that stack.

## Execution modes

When a skill or runbook needs explicit cost and depth tradeoffs, prefer these mode names:

- `fast`
- `standard`
- `strict`

Suggested meaning:

- `fast` for quick checks, small edits, and lightweight verification
- `standard` for normal development work
- `strict` for review, release, security, migration, or risky refactors

Keep mode meaning in the skill text itself rather than depending on hidden agent state.

## Suggested workflow

1. Start from a template here.
2. Copy the skill into `shared/skills/` or a repo-local `.agents/skills/`.
3. Adjust examples, commands, and review criteria for the actual repo.
4. Use `tools/scripts/sync-codex-skills.sh` if you maintain a tool-neutral source layer and need to sync into `.agents/skills/`.

These templates are examples, not a mandatory install set.
