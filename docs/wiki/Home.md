# Codex Workspace

Codex Workspace is a local-first structure for managing many standalone repositories on one machine without forcing them into a monorepo.

This wiki is a lightweight navigation layer. The canonical documentation lives in the repository itself:

- [README](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/README.md)
- [Docs index](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/README.md)

## What This Repo Is For

Codex Workspace exists to keep local development practical when your machine contains many unrelated repos.

It combines:

- a predictable folder layout for mixed stacks
- shared caches and helper tooling
- lightweight workspace metadata
- a filesystem-first documentation and context model
- a practical Workspace Hub app for discovery, runtime control, and previews

## Core Principles

- Do not merge unrelated repos into one dependency structure.
- Share caches, not installs.
- Treat each repo as independently runnable.
- Do not make a reverse-proxy or mapped-host layer mandatory.
- Prefer direct local runtime for frontend and dev-server projects.
- Keep WordPress handling pragmatic.
- Use lightweight manifests where explicit runtime behavior helps.

## Expected Workspace Layout

```text
Codex Workspace/
├── docs/
├── repos/
├── tools/
├── cache/
├── shared/
└── workspace.code-workspace
```

## Start Here

If you're new to the project, begin with:

1. [README](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/README.md)
2. [Docs index](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/README.md)
3. [Overview](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/00-overview.md)
4. [Workspace handover](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/01-codex-workspace-handover.md)

## Workspace Hub

Workspace Hub is the most concrete product in this repo today. It scans sibling repos, classifies them conservatively, shows runtime and metadata state, and provides start, stop, open, and preview actions without forcing all repos into one toolchain.

Read more:

- [Workspace Hub README](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repos/workspace-hub/README.md)
- [Workspace Hub build spec](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/03-workspace-hub-build-spec.md)

## Runtime Model

Typical defaults:

- WordPress: usually `external`
- Vite / static / Three.js / WebGL: usually `direct`
- Other server-side repos: use the repo-native runtime, optionally proxied when that adds clear value

The goal is practical local operation, not one enforced runtime model.

## Metadata And Manifests

Where explicit runtime behavior helps, use lightweight metadata such as `.workspace/project.json`.

Related docs:

- [Examples and templates](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/05-examples-and-templates.md)
- [Project manifest template](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/project-manifest.template.json)
- [Repo index sample](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repo-index.sample.json)

## Community

- Ask questions in [Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a)
- Report reproducible bugs in [Issues](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues)
- Read the [contributing guide](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/.github/CONTRIBUTING.md)
- Read the [support guide](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/.github/SUPPORT.md)

## Canonical Docs

This wiki should stay short and navigational.

Detailed and durable project documentation belongs in the tracked repo under `docs/`, `README.md`, and repo-local docs such as `repos/workspace-hub/docs/`.
