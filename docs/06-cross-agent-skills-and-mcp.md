# 06-cross-agent-skills-and-mcp

## Purpose

This note defines a minimal, future-friendly layout for AI-agent skills and MCP setup in Codex Workspace.

The goal is portability:

- keep reusable guidance in one tracked place
- avoid hard-coding one vendor folder as the source of truth
- let repos opt in without making agent setup a runtime dependency
- keep machine-specific MCP details local and untracked

## Recommendation

Use a layered model:

1. portable tracked skill sources
2. optional agent-specific adapter folders
3. local-only MCP config and secrets

Do not make `.agents/skills/`, `.claude/skills/`, `.github/skills/`, or any similar folder the canonical source for the workspace.

Treat those folders as compatibility targets that can be generated, symlinked, or copied from a portable source when a given tool needs them.

Treat upstream skill catalogs such as [`openai/skills`](https://github.com/openai/skills) the same way:

- use them as optional source material for selected Codex skills
- install specific skills when they are useful
- do not vendor the whole catalog into this workspace by default
- keep canonical workspace skill content in `shared/skills/` or repo-local `.workspace/skills/`

## Minimal layout

```text
Codex Workspace/
├── docs/
│   └── 06-cross-agent-skills-and-mcp.md
├── shared/
│   ├── standards.md
│   └── skills/
│       ├── workspace-maintenance/
│       │   └── SKILL.md
│       └── repo-onboarding/
│           └── SKILL.md
├── tools/
│   ├── templates/
│   │   └── skills/
│   │       └── SKILL.md
│   └── local/
│       └── agents/
│           ├── claude/
│           ├── codex/
│           ├── copilot/
│           └── cursor/
└── repos/
    └── some-repo/
        └── .workspace/
            ├── project.json
            ├── skills/
            │   └── repo-runbook/
            │       └── SKILL.md
            └── mcp/
                └── servers.sample.json
```

Optional generated adapter targets inside a repo may look like this:

```text
some-repo/
├── .agents/skills/
├── .claude/skills/
└── .github/skills/
```

Those folders should usually be ignored by the repo that owns them unless the repo intentionally wants to publish a specific adapter layout.

## What goes where

### `shared/skills/`

Use this for workspace-wide reusable skills that apply across many repos.

Examples:

- workspace maintenance
- repo onboarding
- manifest generation
- mixed-stack troubleshooting

### `repos/<repo>/.workspace/skills/`

Use this for repo-specific tracked skills that should travel with the repo without depending on a specific agent vendor.

This keeps agent guidance close to the repo while avoiding vendor lock-in.

### `tools/templates/skills/`

Use this for starter templates and examples rather than live skill installs.

### `tools/local/agents/`

Use this ignored location for machine-specific exports, generated adapter folders, agent config, and private notes.

This is the right place for local state that should not become a cross-repo contract.

### `repos/<repo>/.workspace/mcp/`

Use this for tracked, portable MCP server examples or repo-safe defaults with no secrets.

Good contents:

- sample configs
- server descriptions
- command placeholders
- documentation of expected environment variables

Do not store real secrets or machine-specific absolute paths here.

## Tracked knowledge vs local memory

Separate durable repo knowledge from operator memory.

Tracked repo knowledge includes things such as:

- repo runtime rules
- stable troubleshooting notes
- reusable workflow guidance
- durable task instructions that other contributors should also see

That knowledge should live in tracked files such as:

- `README.md`
- `docs/`
- `.workspace/project.json`
- `.workspace/skills/`

Local operator memory includes things such as:

- machine-specific paths
- private MCP endpoints
- temporary workarounds
- personal notes and reminders
- secrets or environment-specific preferences

That material should stay in ignored local files by default.

## Promotion rule

If a local note proves stable, broadly useful, and safe to publish, promote it into tracked docs, manifests, or portable skills.

Do not rely on private local memory as the long-term home of canonical repo knowledge.

## Adapter rule

If an agent expects a specific directory such as `.agents/skills/` or `.claude/skills/`, create that as an adapter target, not as the primary source.

That means:

- source from `shared/skills/` or `.workspace/skills/`
- export or symlink into the agent-specific path only when needed
- keep generated adapter folders local unless there is a strong reason to publish them
- if the adapter target lives inside a repo, let that repo decide whether to ignore or publish it

If you need a skill from an upstream catalog, prefer installing that one skill through the agent's supported installer flow rather than copying the upstream repository into `repos/` or `tools/`.

## MCP rule

Skills are portable documentation plus workflow packaging.

MCP is different:

- server support differs by tool
- config file names differ by tool
- auth and secrets are usually machine-specific
- local filesystem paths are often machine-specific

So the safe pattern is:

- track portable MCP examples
- keep real credentials and local endpoints in ignored local config
- generate agent-specific MCP config from the portable examples if needed

## Workspace Hub scope

Workspace Hub v1 should not require skills or MCP to function.

If Workspace Hub gains agent awareness later, the first useful step is visibility rather than execution.

Good future behaviour:

- detect whether a repo has portable skills
- detect whether local agent adapters exist
- show that status in the UI
- link to the relevant folders or docs

Avoid making Workspace Hub responsible for launching or orchestrating agent-specific MCP stacks in v1.

## Default policy

- portable tracked source first
- vendor-specific adapter second
- local secrets and machine paths last
- repo opt-in, never mandatory
- no agent setup should be required to run a repo normally
- promote durable local knowledge into tracked files when it becomes generally useful

## Practical outcome

This approach keeps the workspace adaptable if tool conventions change.

If another agent later prefers a new folder name or config location, only the adapter layer needs to change. The tracked skill content and repo-local intent can stay stable.
