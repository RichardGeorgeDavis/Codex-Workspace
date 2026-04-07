# Changelog

## 2026-04-07

- Added a project review addendum to `docs/HANDOVER.md` covering implementation findings, prioritized remediation phases, and immediate improvement actions for `repos/workspace-hub`.
- Documented current review conclusions in handover format: performance risk from repeated full summary scans, API error-message exposure, macOS-first open-target behavior, artifact-index privacy concerns, and backend test coverage gaps.
- Captured the practical follow-up sequence in the handover note: summary caching and invalidation, safer API error responses, cross-platform opener adapters, artifact-index gating, and targeted runtime/search/preview tests.
- Recorded the latest verification snapshot in handover: `pnpm lint` and `pnpm typecheck` passed in `repos/workspace-hub`, while `pnpm test` was blocked in the sandboxed run by a `tsx` IPC permission error.
- Added a pre-Codex checklist and reusable implementation handoff prompt to `docs/HANDOVER.md` so the next Codex pass can execute against explicit performance, privacy, portability, and test-coverage expectations.
- Implemented first remediation slice in `repos/workspace-hub`: snapshot-keyed workspace discovery caching plus explicit invalidation hooks on mutating routes, generic client-safe 500 responses with server-side error logging, and opt-in artifact indexing via `WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS`.
- Verified post-change quality gates for this slice with `pnpm --dir "repos/workspace-hub" lint` and `pnpm --dir "repos/workspace-hub" typecheck`.
- Added focused server tests in `repos/workspace-hub/test/workspace-cache-search.test.ts` to cover cache invalidation behavior and artifact search env-gating behavior.
- Confirmed full local test-suite pass outside sandbox with `pnpm --dir "repos/workspace-hub" test` (`5 passed, 0 failed`).

## 2026-04-05

- Added `VoltAgent/awesome-design-md` to `tools/manifests/reference-sources.json` so the workspace can install and refresh a reviewed local snapshot of the upstream `DESIGN.md` catalog under ignored `tools/ref/`.
- Updated the workspace docs to treat upstream `DESIGN.md` catalogs as reviewed reference material rather than workspace dependencies, and documented the `sync-reference-snapshots.sh --run voltagent-awesome-design-md` update path.
- Added `tools/scripts/use-design-md.sh` plus ignored `cache/design-md/` so the workspace can mirror the reviewed `DESIGN.md` files into a stable local path and copy a selected `DESIGN.md` into a repo root on demand.

## 2026-04-03

- Added shared Playwright environment helpers and automatic Workspace Hub export of the shared Playwright browser cache so repo install and runtime commands reuse one browser download by default.
- Verified the stable workspace baseline with automated checks plus live Workspace Hub smoke tests for direct-preview, external WordPress, and mixed-stack SwiftPM repos.
- Bumped `repos/workspace-hub` to `1.0.0` and normalized release docs/scripts away from the old beta-exit wording.
- Added a tracked repo-intake template set under `tools/templates/repo-docs/`, including a starter `README.md` template and placeholder cover image.
- Added a Workspace Hub repo intake action that can scaffold or normalize `README.md`, inject a repo cover block, create a placeholder cover image, and write a manifest only when the repo needs explicit runtime metadata.
- Updated the workspace docs index, handover note, Workspace Hub README, and manifest guide to reflect the new repo intake flow.
- Added `tools/manifests/reference-sources.json` plus `tools/scripts/sync-reference-snapshots.sh` so reviewed upstream harness snapshots such as `oh-my-codex` and `oh-my-openagent` can be refreshed into ignored `tools/ref/` folders without becoming workspace dependencies.
- Documented the recommended stance for these references: `oh-my-codex` can be trialed as an optional external layer or dedicated fork, while `oh-my-openagent` should stay reference-only unless its license and runtime are an intentional fit.
- Added built-in Workspace Hub detection for repo-local agent surfaces including `AGENTS.md`, `.agents/skills`, OMX state, and `.opencode` / `oh-my-openagent` project config.
- Added tracked shared skill packs, AGENTS tree scaffolding, OpenCode template assets, and an agent-tooling doctor so the useful upstream patterns now exist as workspace-native base features.
- Added first-class Workspace Hub repo agent presets for Codex baseline, OMX-ready, OpenCode, and all-in-one setup, plus a workspace agent-environment panel that makes the local command/tooling state visible.
- Added reviewed `openai/skills` and `openai/codex` reference entries so the tracked markdown links that are worth keeping now have a manifest-backed local review path under `tools/ref/`.
- Extended Workspace Hub agent tooling to detect and scaffold official `.codex/` surfaces alongside `.agents/skills` and `.opencode/`.
- Realigned the workspace docs and helper scripts so official `.codex/` surfaces are the primary Codex path, with `.agents/skills/` retained as an optional compatibility mirror.
- Added fixture-based `workspace-hub` tests for repo-local agent tooling detection and preset scaffolding, using temp workspaces so existing `repos/` content is preserved.
- Added `tools/scripts/bootstrap-workspace.sh`, `tools/scripts/release-readiness.sh`, and `docs/10-release-readiness.md` to define the fresh-machine path, stable contract, migration note, and beta-exit gate.
- Replaced the placeholder `workspace-quality-gate` plugin manifest with concrete metadata and a real non-destructive release-readiness skill.

## 2026-03-26

- Added live Workspace Hub event streaming, lightweight indexed search, and local structured failure reports inspired by reviewed upstream reference patterns.
- Applied the reviewed reference patterns directly in `Workspace Hub` rather than depending on the local `tools/ref/` snapshots.

## 2026-03-23

- Refined the skills guidance so repo-owned Codex skills stay in tracked repo folders, with `shared/skills/` as shared source material and `.workspace/skills/` as an optional secondary compatibility layer.
- Clarified that third-party orchestration layers and generated agent setup should remain optional local tooling rather than the canonical workspace layout.
- Added `tools/scripts/sync-codex-skills.sh` to preview or sync tracked skill sources into repo skill folders.
- Added `docs/08-first-run-and-updates.md` plus `tools/scripts/doctor-workspace.sh` to define onboarding questions, setup profiles, and the recommended layered update flow.
- Added a narrow “patterns, not platforms” note for larger agent systems: progressive skill loading, execution modes, and filesystem-backed job artifacts are in scope, while full orchestration remains local-only and optional.
- Added starter skill templates and a selective install-profile example under `tools/templates/skills/`.
- Added generic MCP templates and hygiene guidance: `read-only` by default, explicit `mutating` opt-in, and quiet stdio/logging conventions for future workspace MCP tools.
- Updated `bootstrap-repo.sh` to use package-manager precedence before lockfile fallback, and added `tools/scripts/setup-workspace-profile.sh` as a guided non-destructive profile helper.
- Added optional tracked spec templates, repo-local UI preview guidance, and a local agent-job artifact bundle script for larger or riskier work.
- Added optional local workflow-state guidance, optional `AGENTS.md` composition guidance, repo-group manifest support in `update-all.sh`, and a hash-seeded `audit.jsonl` file in local job bundles.
- Added importable GitHub ruleset JSON for protecting `main` and `v*` release tags without forcing a PR-only workflow.
- Added minimal tracked GitHub Copilot instructions plus a local-only Copilot skeleton for personal prompts, notes, and machine-specific setup.

## 2026-03-22

- Clarified that upstream skill catalogs such as `openai/skills` should be treated as optional sources for selected Codex skills rather than vendored workspace dependencies.
- Added matching guidance in the root README, the cross-agent skills and MCP note, and the Workspace Hub extension guide.

## 2026-03-21

- Added GitHub Discussions support links so repository questions are routed toward Discussions Q&A instead of Issues.
- Added starter GitHub wiki pages under `docs/wiki/` for a thin navigational wiki that points back to the tracked docs set.
- Expanded the public project framing across the root docs to describe the filesystem-first context model, observable retrieval, and tracked-versus-local memory rules more directly.
- Added cross-agent skills and MCP guidance plus a context-cache and retrieval note for generated summaries and provenance.
- Refreshed the README cover path with a versioned asset to avoid stale GitHub image caching.
- Updated the repository social preview artwork to match the current project framing.
- Moved the canonical workspace handover docs from `tools/docs/` to the root `docs/` folder.
- Removed the duplicated documentation links from `shared/` so it acts as a metadata-only layer.
- Rewrote the repo root `README.md` to behave more like a public project homepage.
- Added `LICENSE`, `.github/CONTRIBUTING.md`, and a scaffolded `.github/FUNDING.yml`.
- Normalized workspace docs away from the old machine-specific path assumptions.

## 2026-03-17

- Moved the six canonical workspace handover docs from the workspace root into `tools/docs/`.
- Repointed `shared/` handover links to the new canonical doc location.
- Updated workspace docs so `tools/docs/` is the source of truth and `shared/` acts as the compatibility and metadata layer.
- Added `tools/docs/HANDOVER.md`.
- Added `tools/docs/CHANGELOG.md`.
- Added or updated repo-root `.gitignore` files across detected repos for macOS metadata and Google Drive icon files.

## 2026-03-16

- Built the workspace foundation and shared tooling structure.
- Created the standalone `repos/workspace-hub/` application.
- Implemented repo discovery, conservative classification, and summary APIs.
- Added core repo actions including open, preview, runtime start, stop, and restart.
- Added persisted repo metadata overrides under `repos/workspace-hub/data/`.
- Added manifest authoring and repo-native preset support in `workspace-hub`.
- Added `repos/workspace-hub/docs/` with repo-local documentation guidance and a manifest guide.
