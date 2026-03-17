# 01-codex-workspace-handover

## Goal

Create a predictable, well-structured local workspace for Codex and local development.

This workspace must:

- live on the desktop inside `Work Documents`
- hold all repositories in one central location
- separate shared tooling from project-specific dependencies
- keep repositories portable and self-contained
- improve install and workflow performance by centralising caches and utility scripts
- support a later Workspace Hub application
- remain compatible with ServBay, Local, and direct local repo execution

## Root path

The workspace root must be:

```text
~/Desktop/Work Documents/Codex Workspace/
```

## Required top-level structure

Create the following structure:

```text
Codex Workspace/
├── repos/
├── tools/
│   ├── bin/
│   ├── scripts/
│   ├── templates/
│   ├── manifests/
│   └── docs/
│       ├── README.md
│       ├── 00-overview.md
│       ├── 01-codex-workspace-handover.md
│       ├── 02-local-runtime-handover.md
│       ├── 03-workspace-hub-build-spec.md
│       ├── 04-build-order-and-dod.md
│       ├── 05-examples-and-templates.md
│       ├── HANDOVER.md
│       └── CHANGELOG.md
├── cache/
│   ├── npm/
│   ├── pnpm-store/
│   ├── yarn/
│   ├── pip/
│   └── homebrew/
├── shared/
│   ├── 00-overview.md
│   ├── 01-codex-workspace-handover.md
│   ├── 02-local-runtime-handover.md
│   ├── 03-workspace-hub-build-spec.md
│   ├── 04-build-order-and-dod.md
│   ├── 05-examples-and-templates.md
│   ├── AGENTS.md
│   ├── README.md
│   ├── repo-index.json
│   └── standards.md
└── workspace.code-workspace
```

## Folder responsibilities

### `repos/`
Holds all Git repositories.  
Each repository remains its own standalone codebase with its own dependencies, lockfiles, and runtime instructions.

Examples:

```text
repos/
├── workspace-hub/
├── wp-client-site/
├── static-portfolio/
├── threejs-scene/
└── internal-tool/
```

### `tools/`
Holds shared scripts, templates, utility binaries, and machine-level helper assets.

Use this for:
- shell helpers
- bootstrap scripts
- clone/update helpers
- templates for repo manifests
- templates for `.codex` config if needed
- canonical handover docs and shared workflow documentation

### `cache/`
Holds shared caches and stores used by package managers or installers.

Purpose:
- reduce repeated downloads
- improve performance across many repos
- keep large caches outside project directories

### `shared/`
Holds workspace-facing metadata, standards, and compatibility links or mirrors for the handover pack.

## Core workspace rules

### Rule 1: repos stay independent
Do not create a shared dependency directory across unrelated repositories.

Specifically:
- no shared `node_modules`
- no forcing all repos onto one package manager
- no flattening multiple repos into a pseudo-monorepo unless intentionally designed as one

### Rule 2: share caches, not project installs
Centralise:
- npm cache
- pnpm store
- yarn cache
- pip cache
- Homebrew download cache where useful

Keep project installs inside their respective repos.

### Rule 3: shared utilities belong in `tools/`
Anything reusable across repos but not part of a project should live in `tools/`.

Examples:
- `tools/scripts/clone-all.sh`
- `tools/scripts/update-all.sh`
- `tools/scripts/bootstrap-node.sh`
- `tools/bin/open-repo`
- `tools/bin/repo-status`

### Rule 4: canonical handover docs belong in `tools/docs/`
The `tools/docs/` folder is the source of truth for:
- the handover pack
- workspace conventions
- runtime rules
- build sequencing

The `shared/` folder should expose compatibility links or mirrors plus workspace metadata such as:
- `shared/repo-index.json`
- `shared/standards.md`
- linked handover docs where helpful

## Suggested machine-level tooling

This workspace should support, but not require, the following machine-level tools:

### Core
- Git
- GitHub CLI (`gh`)
- Codex CLI if used separately
- Homebrew
- `jq`
- `ripgrep`
- `fd`
- `tree`

### Node / JS
- Volta, `fnm`, or similar Node version manager
- npm
- pnpm
- yarn only where legacy repos require it

### Python
- Python 3
- pip
- optional `uv` or `pyenv`

### PHP / WordPress
- Composer
- WP-CLI
- optional PHP version tools if needed

## Preferred Node strategy

Use a Node version manager.  
Do not assume one global Node version is sufficient for all repos.

Preferred approach:
- support per-project version pinning
- allow `packageManager` field or lockfile-driven detection
- allow `.nvmrc` or equivalent in repos

## Cache strategy

Where possible, configure package managers to use the shared cache locations under:

```text
cache/
```

Examples of intended mapping:

- npm cache → `cache/npm`
- pnpm store → `cache/pnpm-store`
- yarn cache → `cache/yarn`
- pip cache → `cache/pip`

Exact shell or config implementation may vary by machine.

## Repo conventions

Each repo may optionally include lightweight local metadata for orchestration.

Recommended optional file:

```text
.workspace/project.json
```

or:

```text
workspace.json
```

This file should define repo type and preferred launch behaviour.  
The detailed spec is defined in `02-local-runtime-handover.md`.

## Repo inventory

Maintain a shared inventory file:

```text
shared/repo-index.json
```

This should store, at minimum:
- repo name
- path
- type
- package manager
- preferred preview mode
- preferred start command
- notes

This file may be generated or maintained by the Workspace Hub app.

## Workspace Hub as a repo

The repository:

```text
repos/workspace-hub/
```

must be treated as a first-class repo inside the workspace, not as a special out-of-band app.

It should:
- follow the same repo rules as other repos
- maintain its own dependencies
- contain its own README and local config
- be able to run without ServBay
- optionally integrate with ServBay

## What Codex may scaffold

Codex may:
- create the folder structure
- create helper scripts in `tools/`
- create or update canonical handover docs in `tools/docs/`
- create templates in `tools/templates/`
- create or update `shared/repo-index.json`
- create the `workspace-hub` repo
- add sensible defaults for repo metadata

Codex must not:
- assume all repos use the same runtime
- move project dependencies into shared folders
- replace Local for WordPress by default
- require ServBay to be present for all repos

## Suggested helper scripts

Potential initial scripts for `tools/scripts/`:

### `clone-all.sh`
Clone multiple repositories into `repos/` from a source list.

### `update-all.sh`
Loop through repos and run a safe Git update such as fast-forward pull where appropriate.

### `detect-repo-type.sh`
Inspect a repo and infer likely type based on known files.

### `bootstrap-repo.sh`
Run first-pass install/setup based on detected stack.

## Definition of done

This handover is complete when Codex can create a workspace that:

- exists at the required desktop path
- contains the expected top-level structure
- keeps repos separated and portable
- uses shared caches for performance
- has a clear place for scripts, docs, and metadata
- has a dedicated `workspace-hub` repo inside `repos/`
- does not conflate infrastructure with runtime orchestration
