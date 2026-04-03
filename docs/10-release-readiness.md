# 10-release-readiness

## Purpose

This note defines the stable release gate and the current stable baseline for
Codex Workspace.

The target is a practical release gate:

- no placeholder shipped surfaces
- a repeatable fresh-machine bootstrap path
- automated coverage for agent-tooling detection and scaffolding
- a clear support matrix
- a migration note for the `.codex/` contract

Current status:

- stable baseline verified on 2026-04-03
- automated checks passed via `bootstrap-workspace.sh`, both doctor scripts, and `release-readiness.sh`
- live Workspace Hub smoke checks passed for a direct-preview repo, an external WordPress repo, and a mixed-stack SwiftPM repo

## Stable contract

Treat these as the release contract unless a real compatibility break forces a
change:

- `AGENTS.md` is the tracked instruction surface
- `.codex/config.toml` and `.codex/skills/` are the official repo-local Codex surfaces
- `.agents/skills/` is a supported compatibility mirror, not the primary Codex path
- `.workspace/agent-stack.json` is the tracked multi-tool hint layer when needed
- `.opencode/` and `.omx/` stay optional
- `tools/ref/` remains reviewed reference-only material, not a runtime dependency

## Release checklist

Run these before calling a release stable or after changes that could affect the workspace contract:

1. `tools/scripts/bootstrap-workspace.sh --run` on a clean clone or fresh machine
2. `tools/scripts/doctor-workspace.sh`
3. `tools/scripts/doctor-agent-tooling.sh`
4. `tools/scripts/release-readiness.sh`
5. Open Workspace Hub and verify a direct-preview repo, an external-preview repo, and one mixed-stack repo still behave correctly

Do not skip the manual repo check just because automated verification passed.

## Support matrix

### Supported baseline

- workspace root layout with `docs/`, `repos/`, `tools/`, `cache/`, and `shared/`
- `repos/workspace-hub/` as the tracked local dashboard
- repo-native runtime handling for Vite, static, PHP, WordPress, and other conservative classifications
- tracked repo-local Codex surfaces in `.codex/`
- compatibility mirroring to `.agents/skills/` when a repo wants it
- reviewed upstream snapshots under `tools/ref/`

### Supported optional layers

- `shared/skills/`
- `.workspace/agent-stack.json`
- `.opencode/`
- `.omx/`
- shared Playwright browser cache under `cache/playwright-browsers`
- shared shell helpers for Playwright and other workspace-wide env defaults via `tools/scripts/print-workspace-env.sh` and `tools/scripts/run-with-workspace-env.sh`
- Local or ServBay for WordPress-oriented workflows

### Not part of the stable baseline

- vendored third-party harnesses as workspace runtime dependencies
- placeholder plugins or TODO manifest surfaces
- forcing every repo into one dependency tree
- mandatory OpenCode, OMX, Bun, ServBay, or Local installs

## Migration note

Older workspace docs treated `.agents/skills/` as the native repo-level Codex
path. The stable contract is now:

- keep official repo-local Codex skills in `.codex/skills/`
- keep `.codex/config.toml` minimal and repo-specific
- use `.agents/skills/` only when you want a tracked compatibility mirror

For existing repos:

1. Move or mirror repo-owned Codex skills into `.codex/skills/`.
2. Keep `.agents/skills/` only if another local tool or workflow still benefits from it.
3. Use `tools/scripts/sync-codex-skills.sh` when tracked source material needs to be copied into repo skill folders.
4. Verify the repo in Workspace Hub after the change.

## Repo safety rule

Stable-release hardening must not rewrite existing sibling repo content by default.

Use:

- temp fixtures for tests
- dry runs for sync tools
- tracked templates and scripts for workspace-wide behavior

Do not mutate nested repos under `repos/` unless the user explicitly asks for it.
