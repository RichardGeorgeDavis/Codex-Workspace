# Codex Workspace

<img src="favicon.png" alt="Codex Workspace favicon" width="128" />

Codex Workspace is a local-first system for working across many standalone repositories as one coherent environment. It gives you shared discovery, runtime control, memory, docs, and agent tooling without forcing those repos into a monorepo or one shared dependency tree.

In practice, that means:

- many repos can feel like one working system without becoming one codebase
- local context can survive repo switches, handover updates, and long gaps between sessions
- shared memory, docs, and tooling can sit above the repos without flattening their runtime models

**Tool-agnostic context.** Whether you use Codex, Cursor, Claude, or mix assistants, the same tracked docs, manifests, optional generated side-load summaries under `cache/context/`, and Workspace Hub give you a stable place to resume work when you switch tools—without rebuilding context from scratch. See [docs/20-ai-context-side-load.md](docs/20-ai-context-side-load.md) and [Context for agents](#context-for-agents) below.

## What Exists Today

### Workspace Hub

The most concrete product in this repo today is [Workspace Hub](repos/workspace-hub/README.md), a local control plane for mixed-stack workspaces. It scans sibling repos, classifies them conservatively, shows runtime and metadata state, and provides start, stop, open, and preview actions without forcing every repo into one toolchain. It complements the filesystem-first docs and scripts rather than replacing them.

<!-- workspace-hub:cover:start -->
![Codex Workspace cover](.github/assets/cover-readme-20260321.png)
<!-- workspace-hub:cover:end -->

Around that, the workspace turns the usual pile of local scripts, scattered notes, and one-off agent setup into a more deliberate system.

The workspace repo around it provides:

- a predictable folder layout for mixed stacks
- shared caches and helper tooling
- lightweight workspace metadata and manifests
- a tracked capability lifecycle for reviewed upstream references, optional abilities, and core services
- a filesystem-first context model for docs, manifests, and agent guidance
- a practical way to resume work across multiple repos without reconstructing context from scratch

## What's included (and why)

| Area | What it is | Why |
| --- | --- | --- |
| `docs/` | Canonical handover pack, indexes, and deep docs | Single source of truth for workspace behavior and conventions |
| `repos/` | Standalone clones (including `workspace-hub/`) | Each project stays its own repo with its own dependencies |
| `tools/` | Scripts, manifests, optional core services (e.g. MemPalace), MCP helpers | Shared automation without merging unrelated installs |
| `cache/` | Shared stores (npm/pnpm, generated context, service artifacts) | Speed and repeatability without a monorepo `node_modules` |
| `shared/` | Workspace metadata, standards, per-user MemPalace state | Durable state that is not duplicated inside each repo |
| `repos/workspace-hub/` | Hub app (React + API) | Discovery, runtime control, manifests, previews, and Workspace memory UI |
| Manifests & `.workspace/` | `project.json` and similar | Explicit runtime when inference is not enough |

For layout detail, see [Workspace layout](#workspace-layout) and [How it works](#how-it-works).

## Who It's For

- People managing many independent local repos across frontend, WordPress, PHP, static, and utility stacks.
- Contributors who want a practical workspace structure plus a concrete app surface in `repos/workspace-hub/`.
- Teams who want local runtime behavior to stay explicit instead of hiding everything behind one central toolchain.

## Who It's Not For

- Teams looking for one shared dependency graph across unrelated repos.
- Setups that expect Docker or a reverse-proxy layer to be mandatory for every project.
- Projects that already want a full monorepo with centralized installs and one runtime model.

## Why This Instead Of A Monorepo

- Repos stay independently runnable on their own terms.
- Caches can be shared without sharing installs.
- Local runtime behavior stays explicit and inspectable.
- WordPress, Vite, static, PHP, and utility repos can coexist without pretending they all want the same workflow.
- Shared memory, docs, and tooling can span the whole workspace without pretending the codebases are one project.

The goal is not to make many repos look like one dependency graph. The goal is to make them feel like one working environment.

## Quick Start

If you want to try the concrete product first, run Workspace Hub:

```bash
cd repos/workspace-hub
pnpm install
pnpm dev
```

Once the Hub is open, use the `Workspace memory` switch in the header to open the dedicated MemPalace page directly. That page now covers service state, target selection, in-app memory search, target-scoped graph builds, and safe wrapper actions.
The dashboard also exposes installable abilities and core services through the Workspace Capabilities panel, and supports a persisted `split` versus `discovery-first` repo layout.

If you want the fuller workspace path after that:

- Start with [docs/08-first-run-and-updates.md](docs/08-first-run-and-updates.md).
- Use [docs/README.md](docs/README.md) for the detailed docs index.
- Use [docs/20-ai-context-side-load.md](docs/20-ai-context-side-load.md) for the generated AI side-load contract and the `generate-context-cache.sh` workflow.
- Use [docs/09-new-repo-baseline.md](docs/09-new-repo-baseline.md) when adding or onboarding a repo.

Repo-specific launchers can also live under `tools/local/commands/`. Those workspace launchers should keep the host on `127.0.0.1`, prefer a repo-specific port range, and step to the next free port instead of randomizing the address. For example, `tools/local/commands/Run Knowledge Palace UI.command` starts the Knowledge Palace local web UI from the workspace root.

## How To Contribute

- Start with [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).
- Use [docs/14-git-and-github-workflow.md](docs/14-git-and-github-workflow.md) for the default issue, discussion, branch, and PR path when a repo does not already document its own collaboration flow.
- Browse current [`help wanted`](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22help%20wanted%22) and [`good first issue`](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22) tickets.
- If the queue is thin, use [docs/13-contributor-roadmap.md](docs/13-contributor-roadmap.md) for the current contribution map and ready-to-open starter issue briefs.
- Use [GitHub Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a) for setup or usage questions.

## Looking For Help

- Docs clarity and repo-entry improvements.
- Repo classification and manifest examples.
- Workspace Hub UX and empty-state polish.
- Runtime diagnostics and contributor-friendly troubleshooting.
- Templates and scripts that reduce workspace setup friction.

## Contribution Areas

- Docs clarity
- Repo classification and manifests
- Workspace Hub UX
- Runtime diagnostics
- Templates and scripts

## Now / Next / Later

- Now: Docs clarity, Workspace Hub UX, repo classification, manifest examples, and script ergonomics are stable enough for outside contribution.
- Next: Capability-surface polish, observability visibility, screenshot and preview reliability, and tighter contributor verification paths.
- Later: Broader capability promotion and deeper workspace-memory flows after the current public surfaces settle.
- Out of scope: Shared dependency installs across unrelated repos, mandatory reverse-proxy or mapped-host tooling for every repo, or forcing every repo through one runtime model.

## Why It Exists

This repo exists to keep local development practical when your machine contains many unrelated repos.

- repos stay independently runnable
- caches can be shared without sharing installs
- local runtime behaviour stays explicit
- WordPress, Vite, static, PHP, and utility repos can coexist cleanly
- optional mapped-host or proxy previews stay optional, not a hidden requirement

## How It Works

Codex Workspace addresses that with a practical filesystem-first model:

- keep repo facts in normal tracked files
- keep generated summaries in `cache/`
- keep core workspace services in `tools/` with durable per-user state in `shared/`
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

Use the starter files when you need explicit repo metadata:
- [project-manifest.template.json](project-manifest.template.json)
- [repo-index.sample.json](repo-index.sample.json)

Recommended maintainer extras:
- `gh` is recommended when you maintain forks, PRs, or reviewed upstream mirrors
- `gh auth login` is optional maintainer setup, not part of the baseline release gate
- optional local reverse-proxy or mapped-host tooling only when specific repos benefit from a shared local front door

## Documentation

Start here:

- [docs/README.md](docs/README.md)
- [docs/08-first-run-and-updates.md](docs/08-first-run-and-updates.md)
- [docs/09-new-repo-baseline.md](docs/09-new-repo-baseline.md)
- [docs/12-maintainer-runbook.md](docs/12-maintainer-runbook.md)
- [docs/13-contributor-roadmap.md](docs/13-contributor-roadmap.md)
- [docs/14-git-and-github-workflow.md](docs/14-git-and-github-workflow.md)
- [docs/15-mcp-profiles-and-trust-levels.md](docs/15-mcp-profiles-and-trust-levels.md)
- [docs/16-mcp-profiles.md](docs/16-mcp-profiles.md)
- [docs/17-mcp-install-and-health-check.md](docs/17-mcp-install-and-health-check.md)
- [repos/workspace-hub/README.md](repos/workspace-hub/README.md)

Deeper docs:

- [docs/00-overview.md](docs/00-overview.md)
- [docs/01-codex-workspace-handover.md](docs/01-codex-workspace-handover.md)
- [docs/02-local-runtime-handover.md](docs/02-local-runtime-handover.md)
- [docs/03-workspace-hub-build-spec.md](docs/03-workspace-hub-build-spec.md)
- [docs/04-build-order-and-dod.md](docs/04-build-order-and-dod.md)
- [docs/05-examples-and-templates.md](docs/05-examples-and-templates.md)
- [docs/06-cross-agent-skills-and-mcp.md](docs/06-cross-agent-skills-and-mcp.md)
- [docs/07-context-cache-and-retrieval.md](docs/07-context-cache-and-retrieval.md)
- [docs/10-release-readiness.md](docs/10-release-readiness.md)
- [docs/11-core-memory-and-reference-promotion.md](docs/11-core-memory-and-reference-promotion.md)
- [docs/18-mcp-server-catalog.md](docs/18-mcp-server-catalog.md)
- [docs/19-mcp-authoring-rules.md](docs/19-mcp-authoring-rules.md)
- [docs/20-ai-context-side-load.md](docs/20-ai-context-side-load.md)

Supporting references:
- [docs/HANDOVER.md](docs/HANDOVER.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [AGENTS.md](AGENTS.md)

When a workspace-wide feature lands, update the public surfaces in the same slice:

- `README.md`
- `docs/README.md`
- `docs/CHANGELOG.md`
- relevant repo-local docs such as `repos/workspace-hub/README.md`
- optional navigation pages under `docs/wiki/` when public navigation should expose the feature

## Context For Agents

Codex Workspace treats agent-facing context as normal workspace content rather than a hidden prompt blob.

The practical model is:

- tracked resources such as repo docs, READMEs, and manifests
- official Codex repo-local skills stored in `.codex/skills/`, with `.agents/skills/` supported as a workspace compatibility mirror and shared skill sources/templates kept in normal tracked folders
- generated context summaries under `cache/context/`
- optional local workflow-state folders such as `.cognetivy/` kept separate from canonical tracked docs
- local-only memory and MCP config kept separate from tracked repo content
- a small official MCP v1 profile set for Codex, installed through workspace-owned scripts instead of ad hoc one-off setup

Side-load summaries are now generated with `tools/scripts/generate-context-cache.sh` into ignored `cache/context/workspace/` and `cache/context/repos/` paths. They are optional `L0` and `L1` cache files, not canonical workspace documentation.

The current MCP v1 support set is intentionally small: OpenAI Docs, Context7, Playwright, Chrome DevTools, and GitHub.

This keeps context easier to inspect, reason about, and adapt across tools while keeping each repo independently runnable.

Tracked repo knowledge belongs in public docs, manifests, and portable skills. Local operator memory belongs in ignored local files until it becomes stable enough to promote into tracked project guidance.

The Workspace Hub app is optional for memory operations. MemPalace ingest, search, and wake-up run through `tools/bin/workspace-memory`, so a shell session or tool-capable chat can save repo or conversation memory without the Hub UI running.

Recommended closeout commands:

- `tools/bin/workspace-memory save-repo <repo-name>` after meaningful repo README, HANDOVER, or setup changes
- `tools/bin/workspace-memory save-workspace` after docs-only or workspace-level planning sessions
- `tools/bin/workspace-memory export-codex current` when you want a readable transcript bundle under `shared/mempalace/<user>/exports/codex/`

Other safe operator commands:

- `tools/bin/workspace-memory status`
- `tools/bin/workspace-memory wake-up`
- `tools/bin/workspace-memory mine-codex-current`
- `tools/bin/mempalace-start`
- `tools/bin/mempalace-sync`

Current note: `wake-up` is much cleaner after low-signal filtering, but it may still occasionally surface config-heavy files such as `tsconfig.node.json`.

When a capability becomes part of how the whole workspace operates, prefer a core-service shape:

- tracked runtime code in `tools/`
- durable per-user state in `shared/`
- disposable artifacts in `cache/`

See:
- [docs/06-cross-agent-skills-and-mcp.md](docs/06-cross-agent-skills-and-mcp.md)
- [docs/15-mcp-profiles-and-trust-levels.md](docs/15-mcp-profiles-and-trust-levels.md)
- [docs/17-mcp-install-and-health-check.md](docs/17-mcp-install-and-health-check.md)
- [docs/07-context-cache-and-retrieval.md](docs/07-context-cache-and-retrieval.md)
- [docs/11-core-memory-and-reference-promotion.md](docs/11-core-memory-and-reference-promotion.md)
- [docs/12-maintainer-runbook.md](docs/12-maintainer-runbook.md)

Current workspace source taxonomy:

- `reference-only` lives under `tools/ref/`
- `ability` lives under `repos/abilities/<slug>/`
- `repo-level adoption` lives under normal `repos/...`
- `core service` lives under `tools/<name>/` with durable state in `shared/<name>/<user>/` and disposable state in `cache/<name>/<user>/`

External skill catalogs such as [`openai/skills`](https://github.com/openai/skills) and upstream design catalogs such as [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) should be treated as optional reviewed sources, not vendored workspace dependencies.

- install only the specific skills that solve a real workflow need
- prefer local skill installation via Codex tooling such as `$skill-installer`
- for repo-level Codex discoverability, prefer tracked `.codex/skills/` and keep `.agents/skills/` only when repo-local compatibility mirroring helps
- keep workspace-wide reusable skill sources in `shared/skills/` and starter templates in `tools/templates/skills/`
- keep the managed VoltAgent `DESIGN.md` catalog as an optional ability under `repos/abilities/voltagent-awesome-design-md` and copy only the specific `DESIGN.md` files a repo actually needs
- use `tools/scripts/capture-site-reference.sh` when a repo needs a conservative `httrack`-based public-site reference capture plus a repo-local acquisition note under `ref/httrack/`
- use `tools/scripts/use-design-md.sh` when you want a stable local mirror under `cache/design-md/catalog/` or need to copy one `DESIGN.md` into a repo root quickly
- keep third-party orchestration layers and generated agent setup local-only unless there is a strong reason to publish them
- do not add the whole upstream skill catalog to `repos/`, `tools/`, or as a submodule unless there is a very specific maintenance reason

If you want local reviewed copies of official upstreams for comparison, keep snapshot-style references under `tools/ref/`, and use `tools/scripts/manage-workspace-capabilities.sh` for installable abilities and core services. `tools/scripts/update-github-refs.sh` remains only as the compatibility wrapper for update-only GitHub-ref flows.

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

The current baseline is a stable local workspace structure plus Workspace Hub 1.x, with enough documentation and tooling to keep mixed repos practical on one machine. Optional mapped-host or reverse-proxy previews remain optional.
