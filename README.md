# Codex Workspace

<img src="favicon.png" alt="Codex Workspace favicon" width="128" />

Codex Workspace is a local-first workspace structure for managing many standalone repositories on one machine without forcing them into a monorepo.

It combines:

- a predictable folder layout for mixed stacks
- shared caches and helper tooling
- lightweight workspace metadata
- a filesystem-first context model for docs, manifests, and agent guidance
- a vendored [Workspace Hub](repos/workspace-hub/README.md) app for discovery, runtime control, and previews

## Why It Exists

This repo exists to keep local development practical when your machine contains many unrelated repos.

- repos stay independently runnable
- caches can be shared without sharing installs
- local runtime behaviour stays explicit
- WordPress, Vite, static, PHP, and utility repos can coexist cleanly
- ServBay remains optional rather than becoming a hard dependency

## Challenges

Mixed local workspaces tend to accumulate useful context in too many places at once:

- repo docs and READMEs
- runtime manifests and config files
- screenshots and previews
- local notes and operator overrides
- repo-specific skills and machine-specific agent setup

When that context is fragmented, tools and agents either miss important signals or pull in too much noise too early.

## Our Approach

Codex Workspace addresses that with a practical filesystem-first model:

- keep repo facts in normal tracked files
- keep generated summaries in `cache/`
- keep reusable skills portable across agents
- keep machine-specific memory and secrets local
- keep retrieval and repo classification explainable

## Core Principles

- Do not merge unrelated repos into one dependency structure.
- Share caches, not installs.
- Treat each repo as independently runnable.
- Prefer direct local runtime for frontend and dev-server projects.
- Keep WordPress handling pragmatic.
- Use lightweight manifests where explicit runtime behaviour helps.

## Core Concepts

### Filesystem-shaped context

Repo context should live in normal files and folders that are easy to inspect, not in hidden tool state.

### Layered context loading

Use short summaries first, then read deeper repo details only when needed.

### Observable retrieval

Repo classification and generated summaries should be explainable from the files that informed them.

### Cautious memory

Keep durable repo knowledge tracked. Keep operator memory, secrets, and machine-specific notes local until they prove broadly useful.

## Workspace Layout

```text
Codex Workspace/
├── docs/
├── repos/
│   └── workspace-hub/
├── tools/
├── cache/
├── shared/
└── workspace.code-workspace
```

`docs/` is the canonical documentation surface.
`shared/` is for workspace metadata such as [`shared/repo-index.json`](shared/repo-index.json) and [`shared/standards.md`](shared/standards.md), not duplicated doc mirrors.

## Quick Start

First run:
- [docs/08-first-run-and-updates.md](docs/08-first-run-and-updates.md)
- [docs/10-release-readiness.md](docs/10-release-readiness.md)
- `tools/scripts/bootstrap-workspace.sh`
- `tools/scripts/doctor-workspace.sh`
- `tools/scripts/setup-workspace-profile.sh`
- `tools/scripts/init-agent-job-bundle.sh`

Review the docs index:
- [docs/README.md](docs/README.md)

If you are adding or onboarding a repo in this workspace:
- [docs/09-new-repo-baseline.md](docs/09-new-repo-baseline.md)

Run the local dashboard:

```bash
cd repos/workspace-hub
pnpm install
pnpm dev
```

Use the starter files when you need explicit repo metadata:
- [project-manifest.template.json](project-manifest.template.json)
- [repo-index.sample.json](repo-index.sample.json)

## Documentation

Start here:
- [docs/README.md](docs/README.md)
- [docs/00-overview.md](docs/00-overview.md)
- [docs/01-codex-workspace-handover.md](docs/01-codex-workspace-handover.md)
- [docs/02-local-runtime-handover.md](docs/02-local-runtime-handover.md)
- [docs/03-workspace-hub-build-spec.md](docs/03-workspace-hub-build-spec.md)
- [docs/04-build-order-and-dod.md](docs/04-build-order-and-dod.md)
- [docs/05-examples-and-templates.md](docs/05-examples-and-templates.md)
- [docs/06-cross-agent-skills-and-mcp.md](docs/06-cross-agent-skills-and-mcp.md)
- [docs/07-context-cache-and-retrieval.md](docs/07-context-cache-and-retrieval.md)
- [docs/08-first-run-and-updates.md](docs/08-first-run-and-updates.md)
- [docs/09-new-repo-baseline.md](docs/09-new-repo-baseline.md)
- [docs/10-release-readiness.md](docs/10-release-readiness.md)

Supporting references:
- [docs/HANDOVER.md](docs/HANDOVER.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [AGENTS.md](AGENTS.md)
- [repos/workspace-hub/README.md](repos/workspace-hub/README.md)

## Workspace Hub

Workspace Hub is the most concrete product in this repo today. It scans sibling repos, classifies them conservatively, shows runtime and metadata state, and provides start, stop, open, and preview actions without forcing all repos into one toolchain.

<!-- workspace-hub:cover:start -->
![Codex Workspace cover](.github/assets/cover-readme-20260321.png)
<!-- workspace-hub:cover:end -->

See:
- [repos/workspace-hub/README.md](repos/workspace-hub/README.md)
- [repos/workspace-hub/docs/manifest.md](repos/workspace-hub/docs/manifest.md)
- [repos/workspace-hub/docs/runtime-troubleshooting.md](repos/workspace-hub/docs/runtime-troubleshooting.md)

## Context For Agents

Codex Workspace treats agent-facing context as normal workspace content rather than a hidden prompt blob.

The practical model is:

- tracked resources such as repo docs, READMEs, and manifests
- official Codex repo-local skills stored in `.codex/skills/`, with `.agents/skills/` supported as a workspace compatibility mirror and shared skill sources/templates kept in normal tracked folders
- generated context summaries under `cache/context/`
- optional local workflow-state folders such as `.cognetivy/` kept separate from canonical tracked docs
- local-only memory and MCP config kept separate from tracked repo content

This keeps context easier to inspect, reason about, and adapt across tools while keeping each repo independently runnable.

Tracked repo knowledge belongs in public docs, manifests, and portable skills. Local operator memory belongs in ignored local files until it becomes stable enough to promote into tracked project guidance.

See:
- [docs/06-cross-agent-skills-and-mcp.md](docs/06-cross-agent-skills-and-mcp.md)
- [docs/07-context-cache-and-retrieval.md](docs/07-context-cache-and-retrieval.md)

External skill catalogs such as [`openai/skills`](https://github.com/openai/skills) and upstream design catalogs such as [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) should be treated as optional reviewed sources, not vendored workspace dependencies.

- install only the specific skills that solve a real workflow need
- prefer local skill installation via Codex tooling such as `$skill-installer`
- for repo-level Codex discoverability, prefer tracked `.codex/skills/` and keep `.agents/skills/` only when repo-local compatibility mirroring helps
- keep workspace-wide reusable skill sources in `shared/skills/` and starter templates in `tools/templates/skills/`
- keep reviewed upstream `DESIGN.md` catalogs under `tools/ref/` and copy only the specific `DESIGN.md` files a repo actually needs
- use `tools/scripts/use-design-md.sh` when you want a stable local mirror under `cache/design-md/catalog/` or need to copy one `DESIGN.md` into a repo root quickly
- keep third-party orchestration layers and generated agent setup local-only unless there is a strong reason to publish them
- do not add the whole upstream skill catalog to `repos/`, `tools/`, or as a submodule unless there is a very specific maintenance reason

If you want local reviewed copies of official upstreams for comparison, keep them under `tools/ref/` via `tools/manifests/reference-sources.json` instead of mixing them into the tracked workspace layout.

## Release Readiness

Use the non-destructive release gate before calling a workspace release stable:

```bash
tools/scripts/release-readiness.sh
```

The stable repo contract and `.codex/` migration note live in [docs/10-release-readiness.md](docs/10-release-readiness.md).

## Community

- Ask questions in [GitHub Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a)
- [LICENSE](LICENSE)
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
- [.github/FUNDING.yml](.github/FUNDING.yml)
- [.github/CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md)
- [.github/SECURITY.md](.github/SECURITY.md)
- [.github/SUPPORT.md](.github/SUPPORT.md)
- Support the work: [PayPal](https://www.paypal.com/donate/?hosted_button_id=Z9ET7KXE4MMZS)

## Current Status

The current baseline is a stable local workspace structure plus Workspace Hub 1.0, with optional ServBay integration and enough documentation and tooling to keep mixed repos practical on one machine.
