# 00-overview

## Purpose

This handover pack defines a local development and orchestration setup called **Codex Workspace**.

The goal is to create a central workspace on the Mac desktop that:

- stores all active repositories in one consistent location
- gives Codex a predictable structure to work within
- avoids unnecessary duplication of shared tools and caches
- supports both WordPress and non-WordPress repositories
- allows repositories to be previewed and tested locally
- optionally uses a **reverse proxy or mapped local hostname** as a single entry point when that genuinely helps
- uses a separate **Workspace Hub** application to browse, launch, stop, and open repositories

This pack is intentionally split into separate files so Codex can reason about architecture and runtime concerns clearly.

## Context model

The workspace also aims to keep agent-facing context explicit and inspectable.

That means:

- repo docs and manifests remain the primary source of truth
- official Codex repo-local skills live in `.codex/skills/`, while `.agents/skills/` remains a supported compatibility mirror and shared reusable skill material lives in normal tracked workspace folders
- generated summaries belong under `cache/`
- core workspace services belong under `tools/` with durable per-user data under `shared/`
- reviewed upstream sources should be classified explicitly as `reference-only`, `ability`, `repo-level adoption`, or `core service`
- local-only memory and secrets stay local

The intended result is a filesystem-first context model that is easier to inspect and less opaque than ad hoc prompt assembly.

## Challenges

Mixed-repo workspaces tend to fragment context across docs, manifests, runtime config, local notes, and tool-specific setup.

That creates a few predictable problems:

- useful repo knowledge becomes harder to find
- too much detail gets loaded before relevance is established
- local operator knowledge leaks into tracked docs
- tool decisions become harder to explain

## Approach

Codex Workspace addresses that with a practical local-first model:

- keep repo facts in tracked files
- keep generated summaries in `cache/`
- prefer official `.codex/` repo surfaces plus portable shared sources rather than opaque tool-owned setup
- keep local operator memory separate from tracked project knowledge
- keep classification and retrieval observable

## Files in this pack

### `01-codex-workspace-handover.md`
Use this file when creating the main folder structure, shared tooling layout, cache strategy, conventions, and workspace rules.

### `02-local-runtime-handover.md`
Use this file when building local runtime behaviour, the Workspace Hub app, optional mapped-host or proxy preview integration, local preview logic, and repo launch rules.

### `AGENTS.md`
Use this as the operating instruction layer for Codex when working inside the workspace or inside the Workspace Hub repository.

## Core concept

The system has three layers:

### 1. Codex Workspace
The top-level folder on disk.  
It contains repositories, shared tools, shared caches, and shared documentation.

### 2. Workspace Hub
A separate repository inside the workspace.  
This is a local control panel app for browsing repositories, viewing metadata, starting and stopping local servers, and opening previews.

### 3. Repo-native runtimes
Each repository remains independently runnable in the way that best suits it:
- WordPress via Local (or similar) where appropriate
- static sites via a static server
- Vite / Three.js / WebGL projects via their dev server
- other stacks according to their own tooling

Alongside those layers, the workspace may also adopt a small number of core workspace services when a capability supports the whole workspace rather than one repo.

Examples:

- shared workspace tooling in `tools/`
- per-user durable service state in `shared/`
- long-term memory and retrieval infrastructure such as MemPalace

The context model follows the same principle:
- tracked repo resources are the canonical source of truth
- generated summaries are helper layers
- local memory is private until promoted intentionally

Current reviewed-source taxonomy:

- `reference-only`: reviewed snapshots under `tools/ref/`
- `ability`: optional installable repos under `repos/abilities/`
- `repo-level adoption`: normal tracked repos under `repos/`
- `core service`: tracked runtime code under `tools/` with durable state in `shared/` and disposable state in `cache/`

## Important architectural rule

**Every repository must remain runnable without a workspace-wide reverse proxy or mapped-host layer.**

Optional proxy or mapped-host tooling is treated as:
- a convenient local front door when you choose it
- a single-domain entry point
- a reverse-proxy convenience layer
- an optional local HTTPS or hostname layer

It must not become a hard dependency for every repo.

## Root path

The workspace root is the folder named `Codex Workspace/`.

It may live anywhere on disk. Example locations:

```text
~/Work Documents/Codex Workspace/
~/Local Sites/Codex Workspace/
```

## Recommended local domain (optional)

If you use a reverse proxy or local DNS with a stable hostname, pick one main domain (for example `workspace.local` or another name your tools agree on) and document it in operator notes. The Hub manifest can store path and subdomain fields for stable routing when you use that mode.

## Design intent

This setup should optimise for:

- clarity
- speed
- low duplication
- observable context
- predictable repo handling
- compatibility with Codex
- compatibility with mixed repo types
- clean future expansion
- debuggable agent and tooling behaviour

## Non-goals

This system must **not** assume:

- one shared `node_modules` for all repos
- one monolithic runtime for all stacks
- that every project should be proxied through a shared local front door
- that WordPress, static sites, and JS apps should be run the same way

## Sequence of implementation

Suggested order:

1. create the Codex Workspace folder structure
2. configure shared caches and common tooling
3. create the Workspace Hub repository
4. add repo manifest conventions
5. implement direct local runtime support
6. add optional mapped-host or proxy preview integration where useful
7. refine launch rules and project status tracking
8. update public-facing docs when workspace-wide features such as Workspace memory or capability lifecycle changes land
