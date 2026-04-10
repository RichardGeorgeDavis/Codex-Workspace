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

1. official Codex repo-local surfaces in `.codex/`
2. shared workspace skill sources plus optional `.agents/skills/` compatibility mirrors
3. local-only adapters and MCP config for non-Codex tools

The reviewed `openai/codex` upstream snapshot uses `.codex/skills/` as the official repo-local skill surface. This workspace also supports `.agents/skills/` as a tracked compatibility layer when repos want a mirrored copy for other local tooling.

Do not let every vendor-specific folder become an equal source of truth.

Skills and MCP are not the only tracked agent-facing layer.

For larger changes, an optional tracked spec layer such as `openspec/` can hold durable requirements and review intent without making the workspace depend on a bigger orchestration runtime.

For this workspace:

- use `.codex/skills/` when a tracked repo skill should be directly discoverable by official Codex
- use `.agents/skills/` only when the repo also wants a workspace-native compatibility mirror
- use `shared/skills/` for reusable workspace-wide skill source material
- use `.workspace/skills/` only when a repo intentionally maintains a tool-neutral source layer that is later exported or synced into `.codex/skills/` and optional `.agents/skills/`
- keep non-Codex adapter folders as compatibility layers rather than primary sources

If `AGENTS.md` files become too large to maintain comfortably, optional composition tooling can help manage fragments.

When using that kind of tool here:

- keep the committed `AGENTS.md` file as the canonical tracked output
- keep composition tooling optional and local-friendly
- treat fragments as authoring aids, not as a new mandatory runtime dependency

Treat upstream skill catalogs such as [`openai/skills`](https://github.com/openai/skills) the same way:

- use them as optional source material for selected Codex skills
- install specific skills when they are useful
- do not vendor the whole catalog into this workspace by default
- keep official repo-level Codex skills in `.codex/skills/`
- keep `.agents/skills/` only as an optional compatibility mirror when needed
- keep shared reusable source material in `shared/skills/` and `tools/templates/skills/`

Treat upstream design catalogs such as [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) similarly:

- classify it as an optional workspace `ability`
- keep the managed catalog as a standalone repo under `repos/abilities/voltagent-awesome-design-md`
- refresh it with `tools/scripts/manage-workspace-capabilities.sh update --run voltagent-awesome-design-md` when you want newer `DESIGN.md` files
- copy only the specific `DESIGN.md` files a repo needs into that repo instead of making the catalog a shared runtime dependency

The reviewed update flow now uses one classification-aware lifecycle: snapshot sources such as `openai/skills` and `openai/codex` stay under `tools/ref/`, optional abilities such as `VoltAgent/awesome-design-md` live under `repos/abilities/`, and core workspace services live under `tools/`.

Third-party orchestration layers that generate `AGENTS.md`, skills folders, or MCP config should remain optional local tooling by default rather than becoming the canonical workspace layout.

Larger agent harnesses are best treated here as pattern sources rather than dependencies.

If you want to study or compare an upstream harness without adopting it, keep it as an ignored reference snapshot under `tools/ref/` and refresh it with `tools/scripts/sync-reference-snapshots.sh`.

Current examples:

- `oh-my-codex` is a candidate optional local Codex workflow layer, but it should be installed from its own package or a dedicated fork rather than pulled into the workspace dependency tree.
- `oh-my-openagent` is useful as a reviewed reference, but its OpenCode-specific runtime model and `SUL-1.0` license make it a poor default workspace dependency.

Useful patterns to use selectively:

- progressive skill loading
- explicit execution modes such as `fast`, `standard`, and `strict`
- selective install or publishing of only the skill packs a workspace actually needs
- common versus language-specific skill pack layout
- optional quality-gate and security-check skills as reusable building blocks

These patterns are reflected in `tools/templates/skills/`.

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
        ├── .codex/
        │   └── skills/
        │       └── repo-runbook/
        │           └── SKILL.md
        ├── .agents/
        │   └── skills/
        │       └── repo-runbook/
        │           └── SKILL.md
        └── .workspace/
            ├── project.json
            └── mcp/
                └── servers.sample.json
```

Optional additional source or adapter targets inside a repo may look like this:

```text
some-repo/
├── .workspace/skills/
├── .github/copilot-instructions.md
├── .github/instructions/
├── .github/prompts/
├── .claude/skills/
└── .github/skills/
```

`.workspace/skills/` is optional and only needed when a repo intentionally maintains a tool-neutral source layer in addition to its official `.codex/skills/` surface and any compatibility mirrors.

Non-Codex adapter folders should usually be ignored by the repo that owns them unless the repo intentionally wants to publish a specific adapter layout.

## What goes where

### `shared/skills/`

Use this for workspace-wide reusable skill source material that may be adapted into repo-level Codex skills.

Examples:

- workspace maintenance
- repo onboarding
- manifest generation
- mixed-stack troubleshooting

### `repos/<repo>/.codex/skills/`

Use this for tracked repo skills that should be natively discoverable by official Codex.

If Codex is the primary consumer, this is the default repo-level location.

### `repos/<repo>/.agents/skills/`

Use this only when a repo also wants a tracked compatibility mirror for workspace-native or non-official local tooling.

### `repos/<repo>/.workspace/skills/`

Use this only when a repo intentionally maintains a tool-neutral source layer or multi-agent compatibility source before exporting into `.codex/skills/` and optional `.agents/skills/`.

This is optional and secondary to `.codex/skills/` for Codex.

### `tools/templates/skills/`

Use this for starter templates and examples rather than live skill installs.

Recommended contents include:

- common packs such as quality and security
- language-specific starter packs such as TypeScript review
- lightweight install-profile examples for selective publishing or syncing

### `tools/local/agents/`

Use this ignored location for machine-specific exports, generated adapter folders, agent config, and private notes.

This is the right place for local state that should not become a cross-repo contract.

For Copilot specifically, this is the preferred home for personal prompt files, local notes, and machine-specific MCP or endpoint details that should not be published.

### `repos/<repo>/.github/copilot-instructions.md`

Use this for short tracked Copilot guidance that applies repo-wide.

Keep it brief and make `AGENTS.md` the canonical source for broader workspace policy when both exist.

Path-specific Copilot instructions and reusable prompt files should only be added when a repo actually benefits from that extra structure.

### `repos/<repo>/.workspace/mcp/`

Use this for tracked, portable MCP server examples or repo-safe defaults with no secrets.

Good contents:

- sample configs
- server descriptions
- command placeholders
- documentation of expected environment variables
- capability tier notes such as `read-only` versus `mutating`

Do not store real secrets or machine-specific absolute paths here.

## Tracked knowledge vs local memory

Separate durable repo knowledge from operator memory.

Tracked repo knowledge includes things such as:

- repo runtime rules
- stable troubleshooting notes
- reusable workflow guidance
- durable specs or requirements for larger changes
- durable task instructions that other contributors should also see

That knowledge should live in tracked files such as:

- `README.md`
- `docs/`
- `.workspace/project.json`
- `openspec/`
- `.codex/skills/`
- `.agents/skills/`
- optional `.workspace/skills/`

Local operator memory includes things such as:

- machine-specific paths
- private MCP endpoints
- temporary workarounds
- personal notes and reminders
- local workflow-state folders such as `.cognetivy/`
- secrets or environment-specific preferences

That material should stay in ignored local files by default.

Optional workflow-state tools can be useful for local runs, events, and collections, but they should not replace tracked docs, specs, manifests, or skills as the durable project contract.

## Promotion rule

If a local note proves stable, broadly useful, and safe to publish, promote it into tracked docs, manifests, or portable skills.

Do not rely on private local memory as the long-term home of canonical repo knowledge.

## Adapter rule

For official Codex repo-local skills, `.codex/skills/` is the primary target.

`.agents/skills/` remains a workspace-native compatibility mirror when a repo wants it.

That means:

- track repo-level Codex skills in `.codex/skills/`
- mirror them into `.agents/skills/` only when compatibility helps
- keep reusable source material in `shared/skills/`
- if a repo also maintains `.workspace/skills/`, sync or export that into `.codex/skills/` and optional `.agents/skills/`
- create non-Codex adapter folders only when needed
- keep generated non-Codex adapters and orchestration state local unless there is a strong reason to publish them
- if an adapter target lives inside a repo, let that repo decide whether to ignore or publish it

If you need a skill from an upstream catalog, prefer installing that one skill through the agent's supported installer flow rather than copying the upstream repository into `repos/` or `tools/`.

If a repo keeps shared or tool-neutral tracked skill sources, use `tools/scripts/sync-codex-skills.sh` to preview or sync those tracked sources into `.codex/skills/` plus any `.agents/skills/` compatibility mirror.

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

Additional hygiene for future workspace MCP tools:

- default tracked examples to `read-only`
- treat `mutating` capabilities as explicit opt-in
- for stdio transports, keep stdout clean and prefer quiet or error-only logging
- document any env vars needed to disable noisy console output
- keep one consistent config shape even if the same tool can run through `npx`, local install, Docker, or a hosted endpoint
- prefer prebuilt or cached reference data when it materially reduces startup cost

Starter templates for this live in `tools/templates/mcp/`.

The current official MCP v1 policy and profile pack now lives in:

- `docs/15-mcp-profiles-and-trust-levels.md`
- `docs/16-mcp-profiles.md`
- `docs/17-mcp-install-and-health-check.md`
- `docs/18-mcp-server-catalog.md`
- `docs/19-mcp-authoring-rules.md`

The official v1 server set is intentionally small:

- `openaiDeveloperDocs`
- `context7`
- `playwright`
- `chrome-devtools`
- `github`

## Workspace Hub scope

Workspace Hub v1 should not require skills or MCP to function.

If Workspace Hub gains agent awareness later, the first useful step is visibility rather than execution.

Good future behaviour:

- detect whether a repo has Codex-native skills
- detect whether additional local agent adapters exist
- show that status in the UI
- link to the relevant folders or docs

Avoid making Workspace Hub responsible for launching or orchestrating agent-specific MCP stacks in v1.

## Default policy

- Codex-native repo skills first
- shared portable source material second
- non-Codex adapters third
- local secrets and machine paths last
- repo opt-in, never mandatory
- no agent setup should be required to run a repo normally
- promote durable local knowledge into tracked files when it becomes generally useful

## Practical outcome

This approach keeps the workspace adaptable if tool conventions change.

If another agent later prefers a new folder name or config location, only the non-Codex adapter layer needs to change. The tracked repo intent can stay stable.
