# AGENTS.md

## Scope

These instructions apply to Codex Workspace and `repos/workspace-hub` unless a
deeper repo-specific `AGENTS.md` overrides them.

For first-time repo intake, use `docs/09-new-repo-baseline.md`.

Every intake must assess Graphify eligibility as `code`, `documents`, `mixed`,
`assets`, or `sensitive`. Do not install Graphify, generate a graph, or add
hooks automatically. Adoption requires a repo-specific `.graphifyignore`, an
explicit `graphify-out/` ignore rule, and passed privacy/correctness gates.

## Priorities

Maintain a clean, high-performance mixed-repo workspace.

Prefer:

- clear structure
- independently runnable repos
- shared caches, not shared installs
- direct local dev servers for frontend/WebGL projects
- optional proxy or mapped-host tooling only when it adds value
- pragmatic WordPress handling, usually through Local for existing sites

Never create one shared `node_modules` or equivalent install directory across
unrelated repos.

## Workspace Shape

Expected top-level folders:

- `docs/`
- `repos/`
- `tools/`
- `cache/`
- `shared/`

Use:

- `docs/` for canonical workspace docs and handover
- `.workspace/project.json` for per-repo runtime metadata
- `tools/templates/` for starter templates
- `shared/` for durable workspace metadata
- `cache/` for generated summaries, runtime artifacts, and shared stores

## Token Budget

Keep agent context small by default.

Do not load or summarize these unless the task explicitly needs them:

- `docs/archive/`
- repo `ref/`
- repo `screenshots/`
- `cache/`
- generated reports, large copied HTML, archives, lockfiles, vendor/build output

For fresh context, read:

1. this file
2. `docs/HANDOVER.md`
3. the repo-local `CONTEXT_CATALOG.md` or established catalog index when present
4. the relevant repo README, handover, manifest, or source files routed by that catalog
5. generated `cache/context/.../entry.md` only if useful

Avoid broad historical docs and deep/artifact search by default.

For repositories with recurring context-navigation costs, assess the optional
tracked context-catalog workflow in `docs/09-new-repo-baseline.md`. Preserve an
existing catalog hierarchy instead of creating a second one. A catalog routes
to authoritative files; it does not become authoritative memory itself.

## Workspace Hub

For `repos/workspace-hub`, prefer:

- readable modular code
- explicit runtime/process handling
- conservative repo classification
- graceful status and failure messages
- existing patterns over new abstractions

Avoid:

- assuming all repos use the same package manager
- assuming proxy mode is better than direct local preview
- hard-coding unstable absolute paths beyond the workspace root
- hidden auto-installs or heavy setup steps

When no manifest exists, classify cautiously:

- Vite, static, Three.js, and WebGL repos default to `direct`
- WordPress projects already managed elsewhere default to `external`

## Workspace Memory

The previous workspace memory service has been removed.

Do not add background memory hooks or leave memory closeout as a manual
reminder. Record closeout in tracked docs instead.

For handover updates:

- repo-specific updates go in repo-local docs and `docs/HANDOVER.md` when relevant
- workspace-level updates go in `docs/HANDOVER.md` and `docs/CHANGELOG.md`
- run `git status --short` before closing so the handover does not imply a cleaner worktree than exists
- if public docs changed, keep `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and relevant repo-local docs aligned
- for an adopted Graphify repo, finalize source and handover text, refresh the
  local graph through `tools/scripts/graphify-repo.sh --run <repo-path>`, and
  make no further source edits without refreshing again

## Local-model context handover

The optional local-first worker at `tools/scripts/local-model-context.sh` is a
task-time preparation helper, not a background memory service. Its public
profile defaults to loopback Ollama for bounded extraction, classification,
inventory, routing suggestions and draft handovers. Optional external routes
must come from an explicitly selected private profile and may receive only
named, tracked, public-safe files. GPT and the operator remain responsible for
authority, privacy, public claims, destructive actions and final approval.

Keep its targets named and narrow. It must not auto-scan all repos, install or
download models, access protected paths by default, or write source material
into generated cache packets. Keep provider keys in macOS Keychain and out of
tracked files, logs and prompts. Use `docs/24-local-model-context-handover.md`
for the packet contract and privacy boundary.

## Public Agent Distribution

Root `AGENTS.md` is the canonical public agent contract, including for
TomeVault distribution. `.github/copilot-instructions.md` is a standalone
Copilot summary, not the source of truth for cross-platform conversion.

When a user request appears to need a skill, check the available local skill
sources before creating, importing, or researching a new one. Start with the
current session's advertised skills, then inspect relevant workspace skill
folders such as `.agents/skills/`, `shared/skills/`, `$CODEX_HOME/skills` or
`~/.codex/skills` when needed. Local operators may also maintain ignored or
private skill libraries outside the public distribution tree. Prefer using or
adapting an existing local skill over adding another copy.

Tracked skills published for TomeVault live under `.agents/skills/` and are
mirrored from `tools/manifests/tomevault-skills.json` by
`tools/scripts/sync-tomevault-skills.sh`. Do not install TomeVault Relay, add
TomeVault badges, or commit generated multi-format TomeVault files unless that
is explicitly requested.

Private skill review and archival destinations are operator configuration and
must not be hard-coded into the public agent contract. Do not rediscover local
review queues, generated outputs or legacy aliases as new public source skills.

## Upstream Updates

When asked to update reviewed GitHub refs or managed upstream mirrors, use:

- `tools/scripts/manage-workspace-capabilities.sh` for abilities and core services
- `tools/scripts/update-github-refs.sh` for dry runs or applied updates

Do not refresh those sources by hand when a wrapper covers the flow.
