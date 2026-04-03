# 05-examples-and-templates

## Purpose

This file provides concrete examples and starter templates for Codex Workspace.

Use these examples when:

- creating new repo metadata files
- scaffolding initial workspace data
- implementing manifest reading in Workspace Hub
- testing direct, external, and ServBay-linked preview modes
- evaluating optional spec-driven or preview-tool additions

This file complements the prose handover files by showing actual example structures.

## Included example files

### `project-manifest.template.json`
A starter template for per-repo runtime metadata.

Recommended destination inside a repo:

```text
.workspace/project.json
```

### `repo-index.sample.json`
A sample shared workspace inventory file.

Recommended destination:

```text
shared/repo-index.json
```

### `tools/manifests/repo-groups.example.json`
A sample repo-group manifest for targeted update workflows.

### `tools/templates/openspec/`
Starter material for a tracked spec-driven layer when a change is large enough to justify requirements, design notes, and task breakdowns.

### `tools/templates/ui-previews/`
Guidance for repo-local component previews using lightweight story files rather than a workspace-wide preview platform.

### `tools/templates/repo-docs/`
Starter material for creating a minimal repo `README.md` and a placeholder cover image when a repo lands under `repos/` without enough onboarding context.

### `tools/templates/artifacts/`
Guidance for local task artifacts such as plans, summaries, logs, screenshots, and other outputs under `cache/context/agents/jobs/`.

### `tools/templates/workflow-state/`
Guidance for optional local workflow-state layers such as `.cognetivy/`, without turning them into the tracked source of truth.

### `tools/templates/agents-md/`
Guidance for optional `AGENTS.md` fragment composition when a single file grows too large to maintain cleanly.

### `tools/templates/codex/`
Starter material for official repo-local Codex setup such as `.codex/config.toml` and `.codex/skills/`.

### `tools/templates/opencode/`
Starter material for optional `.opencode/` and mixed-tool agent presets without turning OpenCode or `oh-my-openagent` into workspace dependencies.

## Example manifest notes

The manifest template demonstrates:

- a direct-run frontend project
- a normal slug
- package manager and commands
- direct preview URL
- optional ServBay path
- optional healthcheck URL
- lightweight notes and tags

Not every field is required in every real project.

## Example repo-docs notes

The repo-docs template demonstrates:

- a minimal repo `README.md` structure
- the Workspace Hub cover block markers
- a repo-local `docs/cover.png` path that can start as a placeholder and later be replaced by a captured preview
- a concise checklist for setup, run, preview, and structure notes

## Example repo index notes

The sample repo index demonstrates a mixed workspace containing:

- the Workspace Hub itself
- a WordPress site
- a Three.js/WebGL repo
- a static site

These examples show how different repo types can coexist inside the same workspace while using different preview modes.

The repo-group manifest shows how named sets such as `core`, `frontend`, or `wordpress` can be updated selectively without hard-coding organization-specific arrays into scripts.

## Recommended Codex behaviour

When creating new repos or manifests:

- use the template as a starting point
- remove empty fields if they are not useful
- prefer explicit values where runtime behaviour matters
- keep repo metadata lightweight and readable

## Example preview-mode mapping

### `direct`
Use for:
- Vite
- Three.js
- WebGL
- most static/dev-server projects

### `external`
Use for:
- Local-managed WordPress sites
- repos opened through another tool or service

### `servbay`
Use when:
- a clean mapped path or local-domain route is stable
- proxying adds real convenience
- the project has been tested successfully in proxy mode

## Optional spec-driven layer

Use a tracked spec layer only when the change is large enough that intent should outlive one chat session.

Suggested tracked structure:

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

This is the cleanest way to add a tracked spec layer without making it mandatory for every small edit.

Do not require it for every small edit.

## Optional UI preview tools

For frontend repos, prefer repo-local preview tools over a workspace-wide component platform.

Recommended choice:

- `Ladle` for fast React or Vite component previews with minimal setup
- `Storybook` when richer docs, addons, or a published component docs surface matter more than setup weight

Keep stories repo-local and prefer Component Story Format when possible so files stay portable between tools.

## Local artifact bundle

For longer-running local work, keep transient evidence in cache instead of tracked docs by default.

Suggested local bundle:

```text
cache/context/agents/jobs/<job-id>/
├── plan.md
├── summary.md
├── sources.json
├── logs/
├── screenshots/
└── outputs/
```

Use:

- `tools/templates/artifacts/` for the convention
- `tools/scripts/init-agent-job-bundle.sh` to create a bundle quickly

## Optional local workflow state

If a user wants more operational history than a local cache bundle, an optional workflow-state layer such as `.cognetivy/` can hold runs, events, and collections.

Use that as local operational state, not as a replacement for tracked docs, specs, manifests, or skills.

## Definition of done

This examples file is complete when Codex can use the included template and sample data as working references for:

- manifest creation
- repo inventory scaffolding
- Workspace Hub parser implementation
- preview-mode testing
- optional spec-driven planning
- local artifact-bundle setup
