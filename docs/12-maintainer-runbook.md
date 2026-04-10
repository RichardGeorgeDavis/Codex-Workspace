# 12-maintainer-runbook

## Purpose

This note defines the practical maintainer path for a clean clone of Codex Workspace.

Use it when you need to:

- prepare a fresh machine
- maintain reviewed upstream mirrors or forks
- install, update, disable, or uninstall workspace abilities and core services
- verify the workspace contract after changes

## Clean-clone baseline

For a clean clone, the baseline expectation is still conservative:

1. clone the workspace repo
2. read `README.md`, `docs/README.md`, and `docs/08-first-run-and-updates.md`
3. run `tools/scripts/doctor-workspace.sh`
4. run `tools/scripts/bootstrap-workspace.sh --run` when you want the safe cache/context setup and `workspace-hub` dependencies prepared

This baseline must work without:

- ServBay
- Local
- `gh auth login`
- optional abilities under `repos/abilities/`

## Optional maintainer setup

Recommended when you maintain forks, pull requests, or reviewed upstream mirrors:

- install `gh`
- run `gh auth login`
- install `codex` if you want to use the managed MCP profile flow locally

This is a maintainer convenience, not a release-gate requirement.

## Collaboration defaults across repos

If a repo does not define its own clearer workflow, use [14-git-and-github-workflow.md](14-git-and-github-workflow.md) as the workspace baseline.

For maintenance work, the practical implication is simple:

- check first whether the target repo overrides the workspace baseline
- if it does not, follow `14-git-and-github-workflow.md` rather than copying a second workflow into repo-local notes
- `gh` remains recommended convenience tooling rather than a clean-clone requirement

## Capability lifecycle

Tracked installable workspace abilities and core services are declared in:

- `tools/manifests/workspace-capabilities.json`

Lifecycle operations run through:

```bash
tools/scripts/manage-workspace-capabilities.sh list
tools/scripts/manage-workspace-capabilities.sh install
tools/scripts/manage-workspace-capabilities.sh update
tools/scripts/manage-workspace-capabilities.sh enable --run <capability-id>
tools/scripts/manage-workspace-capabilities.sh disable --run <capability-id>
tools/scripts/manage-workspace-capabilities.sh uninstall --run <capability-id>
```

Rules:

- dry-run is the default
- `install` and `update` target installable abilities and core services, not normal repos
- `disable` keeps the checkout but removes it from default update and Hub action flows
- `uninstall` removes the managed checkout and disposable cache paths, but does not remove tracked docs

Compatibility wrapper:

```bash
tools/scripts/update-github-refs.sh --list
tools/scripts/update-github-refs.sh --run <capability-id>
```

Use this only when you specifically want the older update-only GitHub-ref flow.

## Repo updates versus capability updates

Normal repos update through:

```bash
tools/scripts/update-all.sh
tools/scripts/update-all.sh --group core
```

Installable abilities and core services update through:

```bash
tools/scripts/manage-workspace-capabilities.sh update
```

Do not mix the two flows.

## MemPalace health checks

Useful checks:

```bash
tools/bin/workspace-memory status
tools/bin/mempalace-start
tools/bin/mempalace-sync
```

Workspace Hub should surface MemPalace as a core service, but these commands remain the direct shell fallback.

## Codex MCP profile management

The official workspace MCP v1 surface is intentionally small and documented in:

- `docs/15-mcp-profiles-and-trust-levels.md`
- `docs/16-mcp-profiles.md`
- `docs/17-mcp-install-and-health-check.md`

Useful maintainer commands:

```bash
tools/scripts/install-mcp-profile.sh --list
tools/scripts/install-mcp-profile.sh default-full
tools/scripts/install-mcp-profile.sh --run default-full
tools/scripts/check-mcp-health.sh --profile default-full
```

If you want the smallest supported profile instead:

```bash
tools/scripts/install-mcp-profile.sh --run safe-readonly
tools/scripts/check-mcp-health.sh --profile safe-readonly
```

Rules:

- tracked examples stay in `tools/templates/mcp/` and repo-local `.workspace/mcp/`
- generated overlays stay in ignored `tools/local/agents/codex/`
- the installer manages only the Codex Workspace MCP block in the active Codex config
- real credentials stay local-only

## Verification pass

Before handing off a workspace-maintenance slice:

```bash
tools/scripts/doctor-workspace.sh
tools/scripts/release-readiness.sh
tools/scripts/manage-workspace-capabilities.sh list
tools/scripts/update-all.sh --list-groups
pnpm --dir "repos/workspace-hub" typecheck
pnpm --dir "repos/workspace-hub" test
```

Add `pnpm --dir "repos/workspace-hub" lint` when frontend or server code changed.

If MCP scripts, templates, or docs changed, also run:

```bash
tools/scripts/install-mcp-profile.sh default-full
tools/scripts/check-mcp-health.sh --profile default-full
```

Public-file review step:

- review the root `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and any affected repo-local docs when a new feature lands
- if the feature changes public navigation or public framing, also review the starter wiki pages under `docs/wiki/`
- this is especially important for workspace-wide features such as Workspace memory, capability lifecycle changes, and Hub-visible operator flows

## Rollback guidance

If a capability update or installation goes wrong:

1. disable it first if the workspace should stop using it
2. uninstall it if you need to remove the checkout and disposable cache paths
3. re-run `doctor-workspace.sh`
4. record the result in `docs/HANDOVER.md` if the issue affects future maintainers

If a repo depends on an ability, the repo must document that requirement explicitly in its own docs. Do not leave ability dependencies implicit.
