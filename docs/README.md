# Docs

This folder is the canonical home for the Codex Workspace documentation set.

Use [../README.md](../README.md) as the public-facing project entrypoint, then use this folder for the detailed workspace and handover material.

## Core pack

Read these in order:

1. `00-overview.md`
2. `01-codex-workspace-handover.md`
3. `02-local-runtime-handover.md`
4. `03-workspace-hub-build-spec.md`
5. `04-build-order-and-dod.md`
6. `05-examples-and-templates.md`
7. `06-cross-agent-skills-and-mcp.md`
8. `07-context-cache-and-retrieval.md`
9. `08-first-run-and-updates.md`
10. `09-new-repo-baseline.md`
11. `10-release-readiness.md`
12. `11-core-memory-and-reference-promotion.md`
13. `12-maintainer-runbook.md`
14. `13-contributor-roadmap.md`
15. `14-git-and-github-workflow.md`
16. `15-mcp-profiles-and-trust-levels.md`
17. `16-mcp-profiles.md`
18. `17-mcp-install-and-health-check.md`
19. `18-mcp-server-catalog.md`
20. `19-mcp-authoring-rules.md`
21. `20-ai-context-side-load.md`
22. `HANDOVER.md`
23. `CHANGELOG.md`

## What Lives Here

- `00-overview.md` to `05-examples-and-templates.md` define the handover pack.
- `06-cross-agent-skills-and-mcp.md` defines the cross-agent portability layout for skills and MCP.
- `07-context-cache-and-retrieval.md` defines the layered context-cache model and retrieval visibility rules.
- `08-first-run-and-updates.md` defines the Hub-first onboarding path, setup profiles, and update flow.
- `09-new-repo-baseline.md` defines the default repo-intake and repo-baseline contract.
- `10-release-readiness.md` defines the stable contract, support matrix, migration note, and stable release gate.
- `11-core-memory-and-reference-promotion.md` defines the workspace source taxonomy and how reviewed GitHub references can graduate into abilities, repo-level adoption, or core workspace services, with MemPalace as the current target.
- `12-maintainer-runbook.md` defines the clean-clone maintainer path, optional GitHub auth, capability lifecycle commands, update flow, and rollback guidance.
- `13-contributor-roadmap.md` defines the public contribution map, label taxonomy, and the current help-wanted starter issue queue.
- `14-git-and-github-workflow.md` defines the workspace-default collaboration path for local-only, git-only, GitHub-backed, and fork-plus-upstream repos when a repo does not provide its own clearer workflow.
- `15-mcp-profiles-and-trust-levels.md` defines the official MCP v1 support boundary, trust classes, and placement rules.
- `16-mcp-profiles.md` defines the named MCP bundles such as `default-full` and `safe-readonly`.
- `17-mcp-install-and-health-check.md` defines the workspace-owned Codex MCP install, verify, and downgrade path.
- `18-mcp-server-catalog.md` defines the small approved MCP server catalog for v1.
- `19-mcp-authoring-rules.md` defines the quality bar for adding future tracked MCP examples.
- `20-ai-context-side-load.md` defines the concrete v1 side-load generator, `entry.md` routing packet, provenance contract, and Workspace Hub freshness semantics for generated `cache/context/` summaries plus the thin-versus-deep search split.
- `HANDOVER.md` summarizes the current state of the workspace, current implementation batches, and the latest acceptance evidence.
- `CHANGELOG.md` records notable workspace-level changes.

## Related Locations

- `tools/bin/` holds small wrappers or launch helpers.
- `tools/scripts/` holds reusable workspace scripts.
- `tools/local/commands/` holds Finder-friendly local launch commands for specific workspace tools or repos.
- `tools/templates/` holds starter metadata templates.
- `tools/manifests/` holds source lists and supporting manifests for scripts.
- `tools/github-rulesets/` holds importable repository ruleset JSON for GitHub.
- `docs/wiki/` holds starter content for the optional GitHub wiki surface.
- `docs/plans/` holds tracked implementation plans for multi-session work (for example docs closeout).
- `repos/workspace-hub/docs/` holds repo-local documentation for Workspace Hub itself.
- `repos/workspace-hub/docs/memory-graph.md` records the adapter-first graph visualization feature for MemPalace data in Workspace Hub.

Useful maintenance scripts:

- `tools/scripts/bootstrap-workspace.sh` prepares safe cache/context folders and can install `workspace-hub` dependencies without touching sibling repos.
- `tools/bin/workspace-memory` manages the MemPalace workspace service lifecycle, local install, and user-scoped paths.
- `tools/bin/mempalace-start` runs the MemPalace MCP server with the workspace-scoped home.
- `tools/bin/mempalace-sync` fast-forwards the MemPalace repo when its working tree is clean.
- `tools/scripts/bootstrap-repo.sh` previews or runs repo-native install/setup using manifest `installCommand` first, then package-manager precedence such as env override, manifest `packageManager`, `package.json`, and lockfiles.
- `tools/scripts/doctor-workspace.sh` runs a non-destructive environment and readiness check for the workspace, Workspace Hub, mixed-stack tooling, and Codex-related setup.
- `tools/scripts/cleanup-sync-noise.sh` removes macOS and sync-client noise files such as `Icon\r` and `._*`, including the broken-ref cases when they leak into `.git/`.
- `tools/scripts/install-shared-playwright-browser.sh` installs Playwright browsers such as Chromium into the shared workspace cache so multiple repos can reuse them.
- `tools/scripts/print-workspace-env.sh` prints the shared workspace environment exports, including the shared Playwright browser cache path.
- `tools/scripts/install-mcp-profile.sh` generates and optionally applies the managed Codex Workspace MCP block for a named profile.
- `tools/scripts/check-mcp-health.sh` verifies the managed MCP block, expected active servers, tracked examples, and wrapper-based browser runtime assumptions.
- `tools/scripts/init-agent-job-bundle.sh` previews or creates a local cache/context bundle for longer-running agent jobs under `cache/context/agents/jobs/`.
- `tools/scripts/generate-context-cache.sh` previews or writes workspace and repo side-load summaries under `cache/context/workspace/` and `cache/context/repos/`, including the generated `entry.md` packet that now acts as the default Hub handoff surface.
- `tools/scripts/release-readiness.sh` runs the stable release gate: workspace doctors, `workspace-hub` test/lint/build, skill-sync dry run, and placeholder-surface checks.
- `tools/scripts/run-with-workspace-env.sh` runs a command with the shared workspace environment, including the shared Playwright browser cache path.
- `tools/scripts/setup-workspace-profile.sh` provides a guided, non-destructive profile check for `core`, `hub`, `mixed-stack`, `wordpress`, `agent-enhanced`, `workflow-state`, `spec-driven`, and `ui-previews`.
- `tools/scripts/manage-workspace-capabilities.sh` lists, installs, updates, enables, disables, or uninstalls tracked workspace abilities and core services, with dry-run mode by default.
- `tools/scripts/update-github-refs.sh` remains the compatibility wrapper for update-only reviewed GitHub-ref flows and delegates to the capability lifecycle command.
- `tools/scripts/capture-site-reference.sh` previews or runs an `httrack` capture for a public-site reference repo, using conservative same-domain defaults and writing capture notes under repo-local `ref/httrack/`.
- `tools/scripts/workspace-port-allocator.sh` centralizes workspace launcher port reservations under `cache/runtime/ports/`, so concurrent launchers can keep `127.0.0.1` stable and step to the next open port without colliding.
- `tools/scripts/use-design-md.sh` mirrors the managed VoltAgent `DESIGN.md` catalog ability into `cache/design-md/catalog/`, lists available site ids, and can copy a selected `DESIGN.md` into a repo root.
- `tools/scripts/sync-reference-snapshots.sh` previews or refreshes ignored upstream reference snapshots under `tools/ref/`, with dry-run mode by default.
- `tools/scripts/sync-codex-skills.sh` previews or syncs tracked workspace skill sources into repo `.codex/skills/` folders plus optional `.agents/skills/` compatibility mirrors, with dry-run mode by default.
- `tools/scripts/trim-git-repos.sh` performs safe Git maintenance across `repos/` by cleaning `.git` sync noise, expiring older reflog entries, and running `git gc` with a conservative prune window.
- `tools/scripts/update-all.sh` can now fast-forward all repos or only a named repo group from a JSON manifest via `--group`.

Local launch examples:

- `tools/local/commands/Run Workspace Hub.command` starts the Hub and opens the browser once it responds.
- `tools/local/commands/Run Knowledge Palace UI.command` starts the Knowledge Palace web UI and opens it once the local API is ready.

Useful template locations:

- `tools/templates/skills/` holds starter skill packs, execution-mode conventions, and a selective install-profile example.
- `tools/templates/repo-docs/` holds a starter repo `README.md` template plus a placeholder cover image for new repo intake.
- `tools/templates/codex/` holds starter material for official repo-local `.codex/` setup.
- `tools/templates/opencode/` holds starter material for optional `.opencode/` setup plus mixed-tool agent presets.
- `tools/templates/mcp/` holds the official MCP v1 profile and server examples, env templates, generic `read-only` versus `mutating` starter examples, and stdio/logging hygiene notes.
- `tools/templates/openspec/` holds lightweight tracked spec and change templates for larger work.
- `tools/templates/ui-previews/` holds guidance for repo-local component preview tooling.
- `tools/templates/artifacts/` holds the local artifact-bundle convention for longer-running agent jobs.
- `tools/templates/workflow-state/` holds guidance for optional local workflow-state layers such as `.cognetivy/`.
- `tools/templates/agents-md/` holds guidance for optional `AGENTS.md` composition when plain single-file authoring stops scaling.

## Public surfaces to review

When a workspace-wide feature lands, update the user-visible surfaces in the same slice:

- root `README.md`
- `docs/README.md`
- `docs/CHANGELOG.md`
- relevant repo-local docs such as `repos/workspace-hub/README.md`
- optional navigation pages under `docs/wiki/` when public navigation should expose the feature

Recent examples include Workspace memory, in-app MemPalace retrieval search, target-scoped MemPalace graph builds, the capability lifecycle, the source taxonomy, Hub-visible layout or capability flows, and the new managed Codex MCP profile flow.

Contributor-facing surfaces now also include the root README funnel, `.github/CONTRIBUTING.md`, the issue-template chooser, `13-contributor-roadmap.md`, and `14-git-and-github-workflow.md`.

## Shared Metadata

The `shared/` folder is reserved for workspace-facing metadata such as `shared/repo-index.json` and `shared/standards.md`.

## Recommended machine-level tools

- Core: `git`, `gh`, `jq`, `rg`, `fd`, `tree`
- Node: a version manager plus `npm`, `pnpm`, and `yarn` where legacy repos need it
- Python: `python3`, `pip`, optional `uv`
- PHP: `composer`, `wp`, optional Local or similar WordPress tooling

`gh` is recommended for maintainers and contributors who manage forks, pull requests, or reviewed upstream mirrors. `gh auth login` is optional setup, not a baseline requirement for a clean clone or release verification.

## Shared cache targets

- npm: `cache/npm`
- pnpm: `cache/pnpm-store`
- yarn: `cache/yarn`
- pip: `cache/pip`
- Playwright browsers: `cache/playwright-browsers`
- Homebrew downloads: `cache/homebrew`

Map package-manager caches here where practical, but keep project installs inside each repo.
