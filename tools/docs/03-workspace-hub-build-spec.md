# 03-workspace-hub-build-spec

## Purpose

This file defines the implementation spec for the **Workspace Hub** application inside Codex Workspace.

This is the build-level handover for Codex.

Use this file when creating the actual Hub application, its structure, its UI, its runtime behaviour, and its relationship to the wider workspace.

This file should be read together with:

- `00-overview.md`
- `01-codex-workspace-handover.md`
- `02-local-runtime-handover.md`
- `AGENTS.md`

## Repository location

The Workspace Hub must live at:

```text
~/Desktop/Work Documents/Codex Workspace/repos/workspace-hub/
```

It is a normal repository inside the workspace and must remain independently runnable.

## Main goal

Build a local control-centre app that:

- scans the sibling repositories inside `../`
- lists and classifies repositories
- allows opening, starting, stopping, and previewing repositories
- stores useful repo metadata
- supports both direct local previews and ServBay-linked previews
- works without ServBay
- can optionally be surfaced through ServBay as the main local dashboard

## Product framing

Workspace Hub is not:
- a replacement for Git
- a replacement for Local
- a full package-manager replacement
- a universal server host
- a monorepo manager

Workspace Hub is:
- a repository browser
- a local runtime launcher
- a preview dashboard
- a local orchestration layer
- a visibility and convenience tool

## Recommended stack

### Preferred v1 stack
Use:

- **Tauri**
- **React**
- **Vite**
- **TypeScript**

Reason:
- lightweight desktop-style app
- strong local file-system/process access
- good fit for Mac
- fast dev cycle
- cleaner than Electron for this use case

### Acceptable alternative
A local web app with:
- React or similar frontend
- Node backend for process and filesystem control

However, Tauri is the preferred route if Codex can scaffold it reliably.

## Core technical requirements

The Hub must be able to:

- inspect directories under `../`
- read key files from each repo
- detect repo type
- read optional repo manifest files
- launch local commands
- track running process state
- stop launched processes
- open URLs in browser
- persist workspace metadata
- degrade gracefully when a repo is not runnable

## Suggested repo structure

A good initial structure for `workspace-hub/`:

```text
workspace-hub/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── repos/
│   │   ├── runtime/
│   │   ├── status/
│   │   ├── filters/
│   │   └── settings/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── styles/
├── src-tauri/
├── public/
├── data/
├── README.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## High-level app sections

The v1 UI should have the following main areas.

### 1. Header
Include:
- app name
- workspace path
- search field
- refresh button
- optional quick actions

### 2. Sidebar or filter panel
Include:
- type filters
- favourites
- tags
- running/stopped filter
- preview mode filter

### 3. Main repo list
This is the primary view.

Each repo card or row should show:
- repo name
- type
- path
- package manager
- current status
- preferred mode
- preview link
- key actions

### 4. Repo details panel
When a repo is selected, show:
- summary metadata
- detected files
- commands
- notes
- current branch
- preview URL
- last run status
- logs or errors where available

### 5. Settings
Include:
- workspace root
- repos folder path
- default ports or ranges
- ServBay base domain
- whether to prefer direct or ServBay preview links
- metadata storage options

## Required v1 features

### Repo discovery
The app must:
- scan the `repos/` folder
- identify directories that are likely repos
- ignore noise and hidden folders where appropriate
- read key files for detection

### Repo detection
The app must classify repos conservatively.

Suggested detection signals:
- `.git` presence
- `package.json`
- `vite.config.*`
- `composer.json`
- `index.html`
- WordPress file patterns
- lockfiles
- known dependencies such as Three.js

### Repo manifest reading
If `.workspace/project.json` exists in a repo, it should override or guide detected behaviour.

### Start / stop support
The app must support:
- running a configured or detected dev command
- tracking the started process
- stopping it cleanly
- showing running/error state

### Preview opening
The app must be able to:
- open direct local URLs
- open external URLs
- open ServBay-based URLs if configured

### Repo utility actions
At minimum support:
- Open preview
- Start
- Stop
- Restart
- Open in Finder
- Open in terminal
- Open README

## Good v1 enhancements

These are valuable and should be included if they do not slow down the first build too much:

- Git branch display
- clean/dirty state
- last opened timestamp
- tags
- favourites/pinned repos
- lockfile/package manager detection
- dependency missing warning
- quick copy URL action

## Data and persistence

The Hub should persist lightweight metadata.

Suggested storage:
- local JSON file under the app repo or app data location
- or a small local database if clearly justified

Persist:
- favourites
- tags
- last opened
- preferred preview mode
- manually overridden commands
- saved notes
- known preview URLs
- last known status

Do not persist sensitive secrets in custom metadata files.

## Repo manifest schema

Preferred path in each repo:

```text
.workspace/project.json
```

Suggested example:

```json
{
  "name": "Three Lab",
  "slug": "three-lab",
  "type": "vite",
  "preferredMode": "direct",
  "packageManager": "pnpm",
  "devCommand": "pnpm dev",
  "buildCommand": "pnpm build",
  "previewCommand": "pnpm preview",
  "previewUrl": "http://localhost:5173",
  "servbayPath": "/repo/three-lab",
  "tags": ["threejs", "art", "experiment"],
  "notes": "Uses heavy assets and WebGL"
}
```

### Suggested fields

- `name`
- `slug`
- `type`
- `preferredMode`
- `packageManager`
- `devCommand`
- `buildCommand`
- `previewCommand`
- `previewUrl`
- `externalUrl`
- `servbayPath`
- `servbaySubdomain`
- `tags`
- `notes`
- `healthcheckUrl`
- `installCommand`

## Repo card requirements

Each repo card should show at minimum:

- repo name
- slug or path
- type
- running/stopped/error status
- preview mode
- package manager if known
- actions: Start, Stop, Open, Details

Good additional fields:
- branch
- dirty/clean state
- last opened
- tags

## Runtime handling requirements

The app must handle processes safely.

### Minimum process behaviour
- spawn process from repo root
- capture exit/failure
- track PID where possible
- allow stop action
- handle already-running cases gracefully

### Error handling
Surface useful messages for:
- command missing
- dependency missing
- port conflict
- env variable missing
- repo not configured
- repo unsupported

### Port handling
Where possible:
- read or infer preview URL
- allow manual override
- support common defaults for Vite and similar tools
- do not assume a single port for all repos

## Preview mode rules

### Direct
Preferred for:
- Vite
- Three.js
- WebGL
- most static/frontend repos

### External
Preferred for:
- WordPress sites already managed in Local
- any repo controlled by another app

### ServBay
Use when:
- proxying is useful
- a stable mapped path is known
- the dashboard is being used as the front door

Do not force everything into ServBay mode.

## ServBay integration requirements

The Hub must support ServBay without depending on it.

Suggested configuration fields:
- base domain, e.g. `workspace.servbay.demo`
- whether ServBay is enabled
- whether preview links should prefer ServBay when available

The Hub should be able to generate preview links like:
- `https://workspace.servbay.demo/repo/<slug>`

But direct URLs must remain supported.

## README requirements

The `workspace-hub` repo must include a proper `README.md` covering:

- what the app is
- what problem it solves
- how to run it
- how repo detection works
- how manifests work
- how direct vs ServBay previews work
- future roadmap

## Suggested v1 development phases

### Phase 1 — Foundation
Build:
- app shell
- repo discovery
- repo list UI
- basic detection
- details panel
- open preview and open folder actions

### Phase 2 — Runtime control
Build:
- start/stop/restart actions
- process tracking
- status indicators
- command overrides
- error display

### Phase 3 — Metadata and polish
Build:
- favourites
- tags
- notes
- last opened
- saved preview preferences
- better filtering and search

### Phase 4 — ServBay support
Build:
- ServBay settings
- ServBay preview-link generation
- optional ServBay path awareness
- dashboard mode through ServBay domain

## Definition of done

This build spec is complete when Codex can implement a Workspace Hub that:

- runs as its own repo inside Codex Workspace
- scans and lists sibling repos
- classifies repo types conservatively
- reads optional repo manifests
- starts and stops supported repos
- opens previews in direct, external, or ServBay mode
- stores useful non-sensitive metadata
- remains useful even if ServBay is not present
- feels lightweight, practical, and scalable

## Implementation guardrails

When building the Hub:

- prefer clarity over cleverness
- keep detection rules transparent
- keep manual overrides easy
- do not hard-code repo-specific hacks without documenting them
- keep the first version practical
- do not try to solve every environment problem in v1
