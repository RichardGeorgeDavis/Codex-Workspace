# Codex Workspace Handover Pack

## Purpose

This workspace README is the master entry point for the handover pack used to build and evolve **Codex Workspace**.

It is intended to be given to Codex so it can:

- understand the overall architecture
- create the workspace structure correctly
- build the Workspace Hub application
- support local repo runtime and preview behaviour
- integrate with ServBay where useful
- avoid incorrect assumptions about shared dependencies or runtime models

This README is the single entry point for the pack.

The canonical handover Markdown now lives in `tools/docs/`.
The `shared/` folder exposes linked copies for compatibility alongside workspace metadata.

## Recommended reading order

Codex should read the files in this order:

### 1. `tools/docs/00-overview.md`
Read first.  
This explains the overall model, the main layers, the root path, and the relationship between Codex Workspace, Workspace Hub, ServBay, and repo-native runtimes.

### 2. `tools/docs/01-codex-workspace-handover.md`
Read second.  
This defines the folder structure, shared caches, tooling layout, repo rules, and workspace-level conventions.

### 3. `tools/docs/02-local-runtime-handover.md`
Read third.  
This defines how repos should be discovered, launched, previewed, stopped, and optionally surfaced through ServBay.

### 4. `tools/docs/03-workspace-hub-build-spec.md`
Read fourth.  
This is the implementation-oriented spec for the Workspace Hub app itself.

### 5. `tools/docs/04-build-order-and-dod.md`
Read fifth.  
This defines the preferred build order, milestones, acceptance criteria, and what should be considered out of scope for v1.

### 6. `tools/docs/05-examples-and-templates.md`
Read sixth.  
This provides example data and references for manifests, repo metadata, and preview mode usage.

### 7. `AGENTS.md`
Read alongside the above files.  
This provides behavioural rules and operating guidance for Codex while working in the workspace.

### 8. `tools/docs/HANDOVER.md`
Read after the core pack if you are taking over an existing build.  
This summarises current workspace state, recent doc moves, and recommended continuation points.

### 9. `tools/docs/CHANGELOG.md`
Use this for a compact record of workspace-level changes.

## Included files

### Core docs
- `tools/docs/00-overview.md`
- `tools/docs/01-codex-workspace-handover.md`
- `tools/docs/02-local-runtime-handover.md`
- `tools/docs/03-workspace-hub-build-spec.md`
- `tools/docs/04-build-order-and-dod.md`
- `tools/docs/05-examples-and-templates.md`
- `tools/docs/HANDOVER.md`
- `tools/docs/CHANGELOG.md`
- `AGENTS.md`

### Example files
- `tools/templates/project-manifest.template.json`
- `tools/templates/repo-index.sample.json`

## What Codex should build

At a high level, Codex should produce:

### 1. The workspace root
At:

```text
~/Desktop/Work Documents/Codex Workspace/
```

### 2. A shared structure
Including:
- `repos/`
- `tools/`
- `cache/`
- `shared/`

### 3. The `workspace-hub` repo
A separate application inside `repos/` that can:
- scan sibling repos
- classify them
- launch and stop supported repos
- open previews
- work with or without ServBay

### 4. Repo metadata support
Including:
- optional per-repo manifest files
- shared repo index support
- preview mode selection

## Important operating rules

Codex must preserve these core rules:

### Rule 1
Do **not** create one shared `node_modules` or equivalent dependency directory across unrelated repos.

### Rule 2
Share caches, not project installs.

### Rule 3
Every repo must remain runnable independently.

### Rule 4
ServBay is optional convenience, not a hard dependency for all repos.

### Rule 5
Frontend/dev-server repos should usually prefer direct local runtime unless there is a tested reason to proxy them.

## Suggested implementation sequence

Condensed sequence:

1. create workspace root and folders
2. add shared docs and metadata placeholders
3. scaffold `workspace-hub`
4. implement repo discovery
5. implement repo detection and manifest reading
6. add open/start/stop flows
7. add persisted metadata
8. add ServBay-aware preview behaviour
9. refine and harden

See `tools/docs/04-build-order-and-dod.md` for the detailed sequence.

## Hand-off intent

This pack is designed to reduce ambiguity and avoid over-engineering.

The intended v1 outcome is:

- a well-structured desktop workspace
- a separate Hub app that is practically useful
- a mixed-runtime model that supports WordPress, static sites, Three.js, WebGL, and similar repos
- optional ServBay single-domain convenience
- clean foundations for future growth

## Definition of success

This handover pack is successful when Codex can use it to build a system that is:

- understandable
- maintainable
- performant enough for daily local use
- flexible across mixed repo types
- not dependent on fragile shared dependency hacks
