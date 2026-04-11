# 02-local-runtime-handover

## Goal

Define how repositories inside Codex Workspace are discovered, launched, previewed, stopped, and optionally routed through a **mapped host or reverse proxy** when that mode is configured.

This document governs the runtime and orchestration layer, not the base folder structure.

## Runtime philosophy

The system must support mixed project types without forcing them into one uniform stack.

Key rule:

**Every repository must remain runnable without optional proxy or mapped-host tooling.**

A reverse proxy or local hostname layer is useful as:
- a single local domain entry point
- a reverse proxy layer
- local HTTPS or hostname convenience
- a front door for the workspace

It is not the only runtime method.

## Main runtime components

### 1. Workspace Hub
A separate repo/app located at:

```text
repos/workspace-hub/
```

This app acts as the local control centre.

### 2. Optional mapped-host / proxy layer
Optional. Some operators use a single local domain or reverse proxy (for example Caddy, nginx, or a dev-stack app) as a unified entry point. The Hub can generate preview links for that setup when manifest fields are set.

### 3. Repo-native runtime
Each repo should run according to its own stack and preferred command.

## Workspace Hub responsibilities

The Workspace Hub application should:

- scan the `repos/` directory
- list all repositories
- detect or read each repo type
- display metadata and runtime status
- start and stop supported repos
- open preview URLs
- open repos in Finder, terminal, editor, or Codex where useful
- store known ports and preferred launch methods
- optionally provide **mapped-host-aware** preview links when `servbayPath` / `servbaySubdomain` (stable manifest keys) are set

## Recommended Hub app approach

Preferred v1 approach:
- lightweight local app
- good file system and process control
- easy to run without extra complexity

A strong option is:
- a local web app using React, Vite, and a small Node backend process manager

Do not over-engineer v1.

## Supported repo categories

At minimum, support the following categories.

### `wordpress`
Typical indicators:
- WordPress structure
- PHP entrypoints
- composer setup for WordPress
- Local or another host mapping may already exist

Preferred handling:
- usually opened through Local or similar
- Hub may store external URL and helper actions
- Hub does not need to become a full WP environment manager in v1

### `static`
Typical indicators:
- `index.html`
- no major app framework
- static asset folders

Preferred handling:
- static file server
- direct port preview
- optional proxy path when configured

### `vite`
Typical indicators:
- `vite.config.*`
- Vite scripts in `package.json`

Preferred handling:
- run dev server via package manager
- default to direct port
- optional proxy path where compatible

### `threejs`
Typical indicators:
- Three.js dependencies
- Vite/static setup
- WebGL or asset-heavy frontend project

Preferred handling:
- treat similarly to `vite` or `static`
- direct port usually preferred
- proxy path optional

### `node-app`
Typical indicators:
- `package.json`
- server or framework app
- custom start/dev script

Preferred handling:
- run repo-native dev command
- track assigned port
- open direct preview or proxied preview

### `php`
Typical indicators:
- `composer.json`
- PHP entrypoints
- non-WordPress PHP projects

Preferred handling:
- mapped-host friendly where appropriate
- or direct repo-native method depending on stack

### `other`
Fallback category where launch rules are unknown or manual.

## Repo manifest

Each repo may optionally define a manifest file for the Hub to read.

Preferred path:

```text
.workspace/project.json
```

Example:

```json
{
  "name": "Three Lab",
  "type": "vite",
  "preferredMode": "direct",
  "packageManager": "pnpm",
  "devCommand": "pnpm dev",
  "buildCommand": "pnpm build",
  "previewCommand": "pnpm preview",
  "previewUrl": "http://localhost:5173",
  "notes": "Needs WebGL-capable browser"
}
```

## Manifest fields

Suggested fields:

- `name`
- `type`
- `preferredMode` → `direct` | `servbay` | `external` (the value `servbay` means mapped-host/proxy preview; see Hub manifest docs for stable JSON keys)
- `packageManager`
- `devCommand`
- `buildCommand`
- `previewCommand`
- `previewUrl`
- `externalUrl`
- `rootPath`
- `notes`
- `tags`
- `isWordPress`
- `servbayPath`
- `servbaySubdomain`
- `healthcheckUrl`

Not every field is required.

## Detection rules

If no manifest exists, the Hub should infer repo type from files.

Examples:

- `vite.config.js`, `vite.config.ts` → `vite`
- `package.json` with Three.js dependency → `threejs`
- WordPress structure → `wordpress`
- `index.html` only → `static`
- `composer.json` and PHP entrypoints → `php`
- `Dockerfile` present → note containerised possibility, but do not require Docker in v1

Detection should be conservative.  
Where uncertain, classify as `other` and allow manual setup.

## Preview modes

Repos may be opened in one of three modes.

### `direct`
Open directly on the repo’s own local port.

Examples:
- `http://localhost:5173`
- `http://localhost:4321`

Use this when:
- the repo works cleanly on its own dev server
- proxying adds unnecessary complexity
- the project expects to run at root

### `servbay` (mapped host / proxy)
The manifest uses the stable enum value `servbay` for previews served through a configured path or subdomain on your local domain (see `servbayPath` and `servbaySubdomain`).

Use this when:
- clean URLs are useful
- local HTTPS or a stable hostname is desired
- proxying is stable for that project
- the Hub is being used as a single front door

### `external`
For projects handled by another tool such as Local.

Example:
- `https://client-site.local`

Use this when:
- another app already owns the runtime
- the Hub should link out instead of starting the stack itself

## Recommended default preview strategy

Default to:
- `external` for WordPress projects already managed in Local
- `direct` for Vite, Three.js, WebGL, and most static repos
- `servbay` only where a mapped path or subdomain is clearly useful and stable

This avoids fragile path/proxy assumptions.

## Optional mapped-host integration rules

Treat reverse-proxy or mapped-host tooling as:
- optional convenience
- single-domain entry point
- reverse-proxy front door

It should be able to surface:
- the Workspace Hub app
- selected repo previews
- selected local services

Recommended pattern:
- one main site entry on your local domain
- one main local hostname
- reverse-proxy rules to local repo ports where needed

Do not assume each repo needs its own site entry.

## URL strategy

Pick a main local domain in operator docs if you use this mode (example: `https://workspace.local`). Suggested path structure:

- `/` → Workspace Hub
- `/repo/<slug>` → proxied preview where appropriate

Examples:
- `/repo/three-lab`
- `/repo/static-portfolio`

However, the Hub must also support direct local links if a project is better opened directly.

## Process management

The Hub should support:

- starting a repo process
- tracking running/stopped/error state
- tracking PID where possible
- tracking or reading assigned port
- stopping a repo cleanly
- retrying when appropriate
- reporting failures clearly

Do not assume every repo stays alive after launch.  
A repo may fail because:
- dependencies are missing
- port is in use
- command is invalid
- environment variables are missing

## Install and dependency support

The Hub should eventually support light install helpers such as:
- detect missing dependencies
- run install command
- note package manager
- show lockfile presence

But v1 should not attempt to fully solve environment setup for every repo automatically.

## Useful runtime metadata to show

For each repo, the Hub should aim to display:

- repo name
- slug/path
- type
- preferred mode
- package manager
- current branch
- clean/dirty Git state
- running/stopped/error
- preview URL
- last opened
- tags
- notes

## Useful Hub actions

Per repo, aim to support actions such as:

- Open preview
- Start
- Stop
- Restart
- Open in Finder
- Open in terminal
- Open in editor
- Open in Codex
- Install dependencies
- View README
- Copy local URL

## Suggested v1 priorities

### Phase 1
- scan repos
- show list/grid
- detect repo type
- read optional manifest
- open repo path
- open preview URL
- manually start/stop supported repos

### Phase 2
- track process state
- auto-detect ports
- Git status
- tags and favourites
- save metadata

### Phase 3
- optional mapped-host integration
- proxy-aware preview links
- health checks
- install helpers
- screenshots or thumbnails

### Phase 4
- richer logs
- domain/path rules per repo
- advanced status handling
- optional multi-user or multi-profile features if ever needed

## Definition of done

This runtime handover is complete when Codex can implement a system where:

- repositories can be discovered from the shared workspace
- the Workspace Hub can run independently of any optional reverse-proxy front door
- an optional mapped host or proxy can act as a single local entry point when configured
- repos can still be opened directly when that is better
- repo handling differs appropriately by project type
- the Hub can start, stop, and open supported repos
- local previews remain practical for WordPress, static sites, Three.js, WebGL, and similar projects
