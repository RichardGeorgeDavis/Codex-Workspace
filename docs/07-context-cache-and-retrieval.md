# 07-context-cache-and-retrieval

## Purpose

This note defines a lightweight context model for Codex Workspace and Workspace Hub.

The goal is to make workspace context easier for agents and tooling to find, load, and reason about without turning the workspace into a separate agent platform.

This is intentionally filesystem-first:

- tracked repo docs remain the source of truth
- generated summaries live in `cache/`
- skills stay portable
- local operator memory stays local
- retrieval remains inspectable instead of opaque

## Why this matters

AI-assisted workspaces often accumulate context in too many places:

- repo docs
- manifests
- README files
- screenshots
- local notes
- optional workflow-state folders
- agent skills
- runtime metadata

When that context is scattered, agents either miss useful information or load too much irrelevant detail too early.

Codex Workspace should avoid that failure mode by treating context as a small, visible filesystem structure rather than as an invisible prompt dump.

## Challenges

In a mixed-repo workspace, the main problems are usually:

- fragmented context across many repos and formats
- too much detail loaded too early
- weak visibility into which files informed a summary or decision
- local-only operator knowledge getting mixed into tracked repo docs
- repo guidance and agent guidance drifting apart

## Our approach

Codex Workspace uses a practical context model built around four ideas:

### 1. Filesystem-shaped context

Useful context should live in normal folders and files that are easy to inspect.

Examples:

- repo `README.md`
- `.workspace/project.json`
- repo-local `.codex/skills/`
- optional repo-local `.agents/skills/` compatibility mirrors
- workspace-wide `shared/skills/`
- optional repo-local `.workspace/skills/` when used as a tool-neutral source layer
- generated repo summaries in `cache/context/`

### 2. Layered context loading

Do not load full repo details by default.

Use a three-layer model:

- `L0` abstract: a short summary for quick relevance checks
- `L1` overview: a concise operating view for planning and navigation
- `L2` details: the original docs, manifests, source files, and logs

### 3. Observable retrieval

When a tool or agent uses a summary, it should be possible to see which files fed that summary.

That keeps repo classification, summaries, and recommendations debuggable.

### 4. Local memory stays local

Private notes, secrets, and machine-specific MCP settings should not be folded into tracked project context.

Tracked context should remain portable. Local memory should remain local.

Local memory is still useful, but it should be deliberate, reviewable, and clearly separated from canonical repo facts.

## Selective Patterns

Some external agent or workspace systems are useful more as pattern libraries than as dependencies.

Useful narrow patterns include:

- progressive skill loading with focused skill packaging
- explicit execution modes for future agent-heavy workflows such as `fast`, `standard`, and `strict`
- selective install or publishing of only the packs a workspace actually needs
- common versus language-specific skill pack layout
- repo-local component previews and story-style compositions rather than one giant shared preview platform
- filesystem-based task artifact layout so long-running work can write summaries and outputs to disk instead of keeping everything in active prompt context
- tracked specs or change proposals for larger work so intent does not disappear with a chat session
- optional local workflow-state layers for runs, events, and collections without forcing them to become the source of truth

These patterns fit the current workspace direction because they can reduce repeated context loading and make long-running work more inspectable without turning Codex Workspace into a full agent platform.

What this workspace should not adopt as baseline behaviour:

- a full super-agent harness
- a component platform with its own scopes, lanes, or release workflow as the workspace default
- sandbox or provisioner infrastructure as a workspace requirement
- plugin, hook, or slash-command runtime as a workspace requirement
- gateway services, IM channels, or chat-bot surfaces
- long-term memory as canonical tracked repo state
- heavy runtime prerequisites for every user just to use the workspace normally

## Context categories

The workspace should treat context as a few explicit categories:

### Resources

Tracked project material such as:

- `README.md`
- `docs/`
- `openspec/`
- `.workspace/project.json`
- screenshots and covers
- selected config files that explain runtime behaviour

### Skills

Portable workflow guidance such as:

- `repos/<repo>/.codex/skills/`
- optional `repos/<repo>/.agents/skills/`
- `shared/skills/`
- optional `repos/<repo>/.workspace/skills/`

In Codex-first repos, `.codex/skills/` is the official repo-local surface. `.agents/skills/` is a supported workspace compatibility mirror.

### Local memory

Private operator notes and machine-specific configuration such as:

- `.workspace/project.local.json`
- `docs/*.local.md`
- `tools/local/agents/`
- optional local workflow-state folders such as `.cognetivy/`

This material should stay untracked by default because it is often private, short-lived, or specific to one machine or operator.

### Runtime state

Generated status or process information such as:

- last known preview URL
- healthcheck state
- process status
- generated context cache metadata

## Cache layout

Use `cache/context/` for generated summaries and retrieval metadata.

Suggested layout:

```text
Codex Workspace/
└── cache/
    └── context/
        ├── workspace/
        │   ├── abstract.md
        │   ├── overview.md
        │   └── sources.json
        ├── agents/
        │   └── jobs/
        │       └── <job-id>/
        │           ├── audit.jsonl
        │           ├── plan.md
        │           ├── summary.md
        │           ├── logs/
        │           ├── screenshots/
        │           ├── outputs/
        │           └── sources.json
        └── repos/
            └── workspace-hub/
                ├── abstract.md
                ├── overview.md
                ├── sources.json
                └── retrieval-log.jsonl
```

## File roles

### `abstract.md`

`L0` summary.

Keep this short enough for a quick relevance decision.

Typical contents:

- what the repo is
- its type
- its preferred runtime mode
- its main preview or entry point

### `overview.md`

`L1` summary.

Keep this detailed enough for planning work without forcing a read of the full repo.

Typical contents:

- stack
- key commands
- main directories
- runtime assumptions
- important manifests
- known caveats

For future long-running agent jobs, a similar compact summary file under `cache/context/agents/jobs/<job-id>/summary.md` can keep follow-up work cheaper and more inspectable.

Use `tools/scripts/init-agent-job-bundle.sh` to create this local cache bundle when the work is large enough to justify it.

### `plan.md` and `summary.md`

These are job-level working files rather than canonical repo docs.

Use them for:

- a scoped plan for the current task
- verification notes and evidence pointers
- a concise local handoff when the work spans multiple sessions

Promote anything durable from these files into tracked docs, specs, or skills once it stabilizes.

### `audit.jsonl`

This is a local tamper-evident event log seed for the job bundle.

Use it to record:

- bundle creation
- later append-only workflow events if you choose to extend the bundle locally
- quick integrity checks when you want an audit trail for sensitive or risky work

### `sources.json`

Retrieval provenance for the current summaries.

Suggested fields:

```json
{
  "version": 1,
  "generatedAt": "2026-03-21T10:30:00Z",
  "repoRoot": "/absolute/path/to/repo",
  "inputs": [
    {
      "path": "README.md",
      "kind": "readme",
      "mtime": "2026-03-20T13:00:00Z"
    },
    {
      "path": ".workspace/project.json",
      "kind": "manifest",
      "mtime": "2026-03-20T13:05:00Z"
    }
  ]
}
```

### `retrieval-log.jsonl`

Optional local log for debugging context usage.

Good entries:

- which repo was queried
- which summaries were read
- which source files were opened next
- whether the cached summaries were stale

Keep this local and disposable.

## Classification provenance

Repo summaries are only part of the story. Repo classification should also be explainable.

Useful provenance to capture or expose includes:

- which detection files were found
- which manifest values overrode inference
- which runtime signals were considered authoritative
- whether local-only overrides influenced the current view

This keeps “why did the tool decide this?” answerable.

## Retrieval flow

The default retrieval path should be simple:

1. check `L0` abstract to see whether the repo or workspace area is relevant
2. if relevant, read `L1` overview for planning context
3. open `L2` source files only when deeper detail is required
4. record the source files used so the result is explainable

This keeps token usage lower and makes context selection easier to debug.

## Source of truth rule

Generated context files are not the source of truth.

The source of truth remains:

- tracked docs
- manifests
- repo files
- explicit local overrides where appropriate

If generated summaries disagree with the repo, regenerate or discard the cache.

Tracked repo facts should win over generated summaries. Local-only operator notes should not silently become shared repo truth.

## Update rules

- write generated context under `cache/`, not into repo docs by default
- keep repo summaries reproducible from tracked files
- never write secrets into `cache/context/`
- do not treat inferred summaries as authoritative when the manifest says otherwise
- prefer regeneration over manual editing of generated files
- keep operator memory reviewable and separate from generated summaries
- promote durable local knowledge into tracked docs instead of letting private notes become the only source

## Workspace Hub scope

For Workspace Hub, the relevant near-term use is modest:

- detect whether context cache files exist
- show whether summaries are fresh or stale
- link to the source files behind a summary
- use cached `L0` and `L1` summaries to reduce repeated full-repo reads
- explain which files and signals drove repo classification when available

Good future enhancements:

- regenerate summaries on demand
- show a summary provenance panel
- explain which detection signals classified a repo

Workspace Hub should not become a mandatory context database service in v1.

## Relationship to skills and MCP

This context cache does not replace the skills and MCP layout.

Use:

- [06-cross-agent-skills-and-mcp.md](06-cross-agent-skills-and-mcp.md) for Codex-native and portable skill and MCP structure
- this file for generated summaries and retrieval visibility

## Practical outcome

This model gives the workspace a simple, inspectable context layer:

- portable tracked context where it belongs
- generated summaries where caches belong
- private operator memory kept private
- better agent navigation without a heavy new platform dependency
- clearer reasoning about how the workspace reached a given summary or classification
