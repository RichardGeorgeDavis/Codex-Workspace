# Workspace Hub

<!-- workspace-hub:cover:start -->
![workspace hub cover](cover.png)
<!-- workspace-hub:cover:end -->

Workspace Hub is a local control plane for people who manage many standalone repos on one machine. If your workspace mixes Vite apps, static sites, WordPress projects, PHP tools, and other repo-native runtimes, Workspace Hub gives you one place to discover them, run them, open previews, and keep lightweight repo metadata without forcing everything into a monorepo.

## At A Glance

| Area | What Workspace Hub does |
| --- | --- |
| Discovery | Scans sibling repos and classifies them conservatively |
| Runtime | Starts, stops, and restarts supported local repos |
| Visibility | Surfaces runtime, install, Git, and dependency-readiness state |
| Metadata | Stores lightweight repo metadata and recent context locally |
| Control model | Keeps each repo independently runnable instead of centralizing installs |

## Why Use It

- reduce context-switching across many local repos
- keep repo-native run models instead of centralizing dependencies
- support mixed stacks where monorepo tooling is a poor fit
- make local repo metadata explicit with lightweight manifests and overrides
- surface health, dependency, Git, and runtime state in one place

## Who It Is For

- developers juggling many independent local repos
- mixed-stack workspaces with frontend, WordPress, PHP, and utility projects
- teams that want a local-first tool rather than a hosted control plane

## What It Does

- scans sibling repos and classifies them conservatively
- supports direct local runtimes and external preview targets
- starts, stops, and restarts supported repos from one UI
- auto-starts supported direct local repos when `Open preview` is used and the local preview is not up yet
- shows runtime, install, Git, and dependency-readiness status
- streams live runtime, install, cover, and activity updates from the local API
- indexes repo metadata, manifests, recent logs, failure reports, and local agent-job artifacts for server-side search
- stores lightweight per-repo metadata and recent activity locally
- writes structured local failure reports for install and runtime errors
- includes persisted appearance controls with five built-in presets and light or dark mode
- reads and writes `.workspace/project.json` manifests when a repo needs explicit behaviour
- captures repo cover screenshots from live previews and can insert them into repo `README.md` files
- gives plain static repos a lightweight direct local server when they do not already have a dev script

## Stack

- React
- Vite
- TypeScript
- Node
- Express

## Workspace Root

Workspace Hub treats the folder named `Codex Workspace/` as the workspace root.

That means the important thing is the folder structure, not the exact disk location. These are both valid examples:

```text
~/Workspaces/Codex Workspace/
/Volumes/FastSSD/Codex Workspace/
```

Workspace root means: the folder that contains `repos/`, `cache/`, and `shared/`.

## Workspace Layout

Default layout:

```text
Codex Workspace/
├── repos/
│   └── workspace-hub/
├── cache/
└── shared/
```

If the workspace lives somewhere else on disk, set `WORKSPACE_HUB_WORKSPACE_ROOT` to the `Codex Workspace/` folder before starting the app.

Example:

```bash
export WORKSPACE_HUB_WORKSPACE_ROOT="$HOME/Code/Codex Workspace"
pnpm dev
```

If you want repo cover screenshots to use a specific browser binary, set:

```bash
export WORKSPACE_HUB_SCREENSHOT_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

If you want a single default cover path convention across repos, set:

```bash
export WORKSPACE_HUB_COVER_RELATIVE_PATH=".github/assets/cover.png"
```

If repo covers are being captured before the page has visually settled, you can increase the wait:

```bash
export WORKSPACE_HUB_SCREENSHOT_SETTLE_MS="5000"
export WORKSPACE_HUB_SCREENSHOT_VIRTUAL_TIME_MS="10000"
```

## About `repos/`

`repos/` should remain in the workspace.

- on disk: it contains the child repositories, including `repos/workspace-hub/`
- in the top-level workspace Git repo: it should be ignored, so it acts as a container rather than tracked project content

So `repos/` should exist, but the root workspace repo should not try to version the nested repos inside it.

## Quick start

Prerequisites:

- Node.js 20+
- pnpm 9+
- a Chrome-compatible browser for cover screenshots, or `WORKSPACE_HUB_SCREENSHOT_BROWSER`

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

Useful commands:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

Default local endpoints:

- app: `http://127.0.0.1:4100`
- api: `http://127.0.0.1:4101/api/health`
- events: `http://127.0.0.1:4101/api/events`
- search: `http://127.0.0.1:4101/api/search?q=preview`

## Repo Covers

Repo covers are a built-in Workspace Hub feature.

- the selected repo can generate a cover from its live preview
- the image is stored inside that repo, not in a central workspace folder
- Workspace Hub updates a marked block in the repo `README.md` so repeated captures replace the current cover instead of duplicating it
- static repos with inferred direct previews can temporarily bootstrap their lightweight local server during capture
- cover capture now waits for the preview to settle before taking the screenshot, and that delay is configurable

Cover path resolution is future-proofed with fallbacks:

1. use `WORKSPACE_HUB_COVER_RELATIVE_PATH` if you set it
2. otherwise keep using the existing marked cover image path if the README already has one
3. otherwise prefer common repo asset paths such as `docs/cover.png`, `.github/assets/cover.png`, `assets/cover.png`, `images/cover.png`, or `screenshots/cover.png`
4. if none of those folders exist, fall back to `docs/cover.png`

## Repo Model

Workspace Hub is designed for workspaces that contain a mix of:

- Vite, static, Three.js, and other frontend repos that usually run best on direct local ports
- WordPress repos that are often managed by Local or another external runtime
- server-side repos that should keep their own native run model

It aims to share caches, not installs, and to keep each repo independently runnable.

## Safety And Trust

Workspace Hub executes repo-native commands locally. It is meant for repos you trust.

- runtime and install commands are executed through the local shell
- local metadata lives under `data/` and should stay untracked
- local failure reports live under `data/failure-reports/` and should stay untracked
- public defaults can live in `.workspace/project.json`
- local-only overrides can live in `.workspace/project.local.json`

## Why Not A Monorepo Tool

Workspace Hub is for cases where the workspace is intentionally a collection of independent repos:

- different stacks
- different package managers
- different run models
- different ownership or deployment boundaries

It helps organize that reality instead of trying to flatten it.

## Local Overrides

Use local override files when you want to keep your own operator notes or machine-specific metadata without publishing them:

- `.workspace/project.local.json` for local manifest overrides
- `docs/*.local.md` for private operator notes

## Docs

- [Doc conventions](docs/INSTRUCTIONS.md)
- [Appearance guide](docs/appearance.md)
- [Local override guide](docs/local-overview.md)
- [Manifest guide](docs/manifest.md)
- [Runtime troubleshooting](docs/runtime-troubleshooting.md)
- [Extension guide](docs/skills.md)

## Current Limitations

- richer dependency detection beyond Node and Composer is still pending
- runtime state is local and in-memory, not shared across machines
- indexed search is intentionally lightweight and local-first, not a hosted code intelligence layer
- the tool assumes a trusted local workspace rather than untrusted repos
- synced folders such as Google Drive, iCloud, or Dropbox can interfere with `.git` directories and should be avoided

## Roadmap

1. Add richer dependency detection beyond Node and Composer.
2. Tighten install guidance for more mixed-stack repo types.
3. Expand lightweight workflow helpers only where they reduce repeated local setup work.
