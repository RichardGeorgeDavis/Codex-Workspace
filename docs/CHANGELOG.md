# Changelog

## 2026-04-11

- Refreshed the root [README](../README.md) with tool-agnostic positioning (Codex, Cursor, Claude), a **Workspace Hub** subsection with the cover image, and a **What's included (and why)** table; shifted public docs to neutral language for optional reverse-proxy and mapped-host previews while keeping compatibility manifest keys documented where needed.
- Updated [HANDOVER](HANDOVER.md) completion review, the project review addendum pointer to [CHANGELOG](CHANGELOG.md) for resolved Hub items, and aligned [docs/README](README.md), wiki stubs, contributor templates, and [AGENTS.md](../AGENTS.md) with the same stance.
- Rewrote [00-overview](00-overview.md) and [02-local-runtime-handover](02-local-runtime-handover.md) so runtime guidance uses generic mapped-host terminology while keeping stable manifest enum and field names (`servbay`, `servbayPath`, `servbaySubdomain`) documented in [repos/workspace-hub/docs/manifest.md](../repos/workspace-hub/docs/manifest.md).
- Added a tracked [docs/plans/readme-docs-closeout.md](plans/readme-docs-closeout.md) plan for future reference, and aligned small Workspace Hub/operator copy surfaces with the same mapped-host wording in `repos/workspace-hub`, `tools/scripts/doctor-workspace.sh`, and `tools/scripts/setup-workspace-profile.sh`.
- Extended `repos/workspace-hub` backlog follow-through with better repo-list prioritization for pinned and recent work, clearer Python-aware dependency readiness, intake-result surfacing in repo details, capability search and inspection, explicit mapped-host routing status, and richer runtime troubleshooting guidance.
- Advanced Workspace memory graph support from file-open-only toward Phase 2 by surfacing derived-edge counts, node-type breakdown, and an in-app graph report preview for the selected target, while clarifying intentional MCP profile usage in the Workspace Hub settings panel.

## 2026-04-10

- Bumped the workspace baseline release to `v1.2.1` and updated `repos/workspace-hub` to `1.2.1` to capture the AI side-load cache flow, handover-closeout automation, and the serialized `workspace-memory` write path.
- Updated the workspace workflow so an explicit handover-update request now implies the matching `workspace-memory` closeout: repo-scoped handovers should trigger `save-repo`, workspace-scoped handovers should trigger `save-workspace`, and mixed closeout should run serially.
- Hardened `tools/bin/workspace-memory` write-heavy commands with a re-entrant workspace lock under `cache/mempalace/<user>/locks/`, so overlapping `save-repo`, `save-workspace`, `mine-*`, and `wake-up` runs serialize instead of contending on the same local MemPalace SQLite and Chroma state.
- Bumped the workspace baseline release to `v1.2.0` and updated `repos/workspace-hub` to `1.2.0` to capture the finished MemPalace search flow, onboarding alignment, Memory Graph Phase 1, and the managed MCP v1 rollout.
- Added `docs/20-ai-context-side-load.md` plus `tools/scripts/generate-context-cache.sh` so Codex Workspace now has a dry-run-first generator for workspace and `workspace-hub` side-load summaries under ignored `cache/context/` paths.
- Updated `docs/07-context-cache-and-retrieval.md`, the root README, the docs index, and the Workspace Hub README so the concrete side-load contract, generator entrypoint, and canonical-versus-generated split are discoverable from the public surfaces.
- Extended `tools/scripts/bootstrap-workspace.sh` to prepare `cache/context/repos/`, and updated Workspace Hub repo details so selected repos can show side-load freshness plus open actions for generated `abstract.md`, `overview.md`, and `sources.json` files without loading side-load metadata on the base-summary path.
- Hardened the managed Playwright and Chrome DevTools wrappers against bad host environments where `HOME=/`, by falling back to workspace-owned runtime and npm-cache paths under `cache/` and forcing Playwright into isolated mode with a stable output directory.
- Added the MCP v1 operating-model pack as `docs/15-mcp-profiles-and-trust-levels.md` through `docs/19-mcp-authoring-rules.md`, preserving the existing `10` through `14` docs and turning the older generic MCP note into a concrete support boundary.
- Added tracked MCP profile and server examples under `tools/templates/mcp/`, plus repo-safe `workspace-hub` examples under `repos/workspace-hub/.workspace/mcp/`.
- Added `tools/scripts/install-mcp-profile.sh`, `tools/scripts/check-mcp-health.sh`, and workspace-root-aware browser wrappers so Codex can generate and manage a bounded MCP block in local Codex config instead of relying on ad hoc manual setup.
- Updated the root README, docs index, first-run guide, maintainer runbook, setup-profile guidance, doctor guidance, and handover notes so the official MCP v1 flow is now documented alongside the existing skills and memory surfaces.
- Finished the Workspace Hub MemPalace search flow end to end, including the `search` service command path, persisted latest-query state, and focused test coverage for command plumbing plus service-state hydration.
- Added `tools/bin/workspace-memory build-graph` and a standalone graph adapter under `tools/scripts/build-mempalace-graph.mjs` that writes target-scoped `graph.json`, `graph.html`, and `graph-report.md` artifacts under `cache/mempalace/<user>/graphs/`.
- Updated Workspace Hub to surface graph metadata on the Workspace memory target context and to expose `Build graph`, `Rebuild graph`, `Open graph`, and `Open graph folder` actions for the selected target.
- Reworked `docs/08-first-run-and-updates.md`, the docs index, the root README, and the Workspace Hub README so the Hub-first onboarding path now stays aligned with the shipped Workspace memory search and graph flows.

## 2026-04-09

- Added `docs/14-git-and-github-workflow.md` as the canonical workspace collaboration baseline for local-only, git-only, GitHub-backed, and fork-plus-upstream repos.
- Updated the root README, contributor guide, docs index, maintainer runbook, contributor roadmap, and new-repo baseline to point to the new default Git and GitHub workflow without making GitHub or `gh auth login` mandatory.
- Added `repos/workspace-hub/docs/memory-graph.md` to document the planned MemPalace graph-visualization feature as an adapter layer on top of MemPalace data rather than a second ingestion engine.
- Updated the Workspace Hub README, the core-memory architecture note, the docs index, and repo-local docs instructions so the new planned memory-graph feature is discoverable from the main documentation surfaces.

## 2026-04-08

- Reframed the root README around a faster public entry path: concrete product first, contributor path near the top, a visible help-wanted lane, and a short `Now / Next / Later` roadmap.
- Reworked `.github/CONTRIBUTING.md`, support guidance, and the issue-template chooser so contributors can move from README to roadmap to issue to PR with less maintainer context.
- Added `docs/13-contributor-roadmap.md` with a public contribution map, label taxonomy, and a curated queue of ready-to-open starter issue briefs for `help wanted` and `good first issue` triage.
- Expanded the bug, docs, and feature issue templates with clearer reproduction and acceptance guidance, and added a dedicated maintainer-facing `Help wanted task` issue template for scoped contributor-ready work.
- Added a first-class MemPalace retrieval flow inside the Workspace Hub memory page, so operators can run workspace-memory searches directly from the UI instead of relying only on shell wrappers or raw service state.
- Updated the root README, docs index, first-run guidance, Workspace Hub README, and handover note so the Workspace memory surface is now described as state plus target context plus in-app search plus safe wrapper actions.
- Bumped the workspace baseline release to `v1.1.0` and updated `repos/workspace-hub` to `1.1.0` to match the new capability lifecycle, Workspace memory, and Hub UX surface area.
- Added an explicit new-repo intake process for public site clone or rip requests, clarifying the expected distinction between deployed mirrors, working local reference copies, and clean rebuilds.
- Added a dedicated repo-docs template for public-site reference repos so `repos/` intake can record source URL, capture date, fetch method, local serve path, and limitations consistently.
- Added fallback guidance for blocked mirror downloads: provide direct asset URLs to the user in chat and store any user-downloaded copies in a repo-local `ref/` folder with source notes.
- Added `docs/11-core-memory-and-reference-promotion.md` to define the workspace source taxonomy and the promotion path from reviewed GitHub references in `tools/ref/` to abilities, repo-level adoption, and core workspace services.
- Recorded the current architecture decision that MemPalace should become a core workspace memory service rather than a normal repo under `repos/`.
- Updated the root README, docs index, overview, workspace handover, context and retrieval note, first-run guidance, and handover summary to reflect the new core-service model and the MemPalace promotion plan.
- Added a handover follow-up note to apply the same promotion process to other reviewed GitHub references as a later phase.
- Expanded the new core-service note with an explicit intake and classification process for any pasted GitHub URL or new `tools/ref/` source, including default review-first handling and placement rules for `reference-only`, `ability`, `repo-level adoption`, and `core service`.
- Integrated MemPalace as a working core workspace service: added `tools/bin` wrappers, a tracked capability registry, bootstrap and doctor support, user-scoped durable state under `shared/mempalace/`, user-scoped cache under `cache/mempalace/`, and initial Workspace Hub service and search support.
- Moved repo and docs MemPalace target metadata under `.workspace/mempalace/`, added conversation-ingest wrappers including `workspace-memory mine-convos` and `workspace-memory mine-codex`, and added a local no-op telemetry override so Chroma telemetry noise can be suppressed at the workspace runtime layer.
- Added readable Codex transcript export support under `shared/mempalace/<user>/exports/codex/`, plus explicit `workspace-memory save-repo`, `save-workspace`, and `mine-codex-current` closeout commands so a chat can save repo, docs, and live Codex-thread memory without the Hub UI running.
- Added curated default MemPalace repo-mining excludes for lockfiles and common generated output, filtered low-signal sources out of Layer 1 wake-up, and added a dedicated Workspace Hub memory page with target context plus a safe command surface for the workspace-owned MemPalace wrappers.
- Added `tools/scripts/manage-workspace-capabilities.sh` plus `tools/manifests/workspace-capabilities.json` so installable workspace abilities and core services now share one lifecycle command.
- Kept `tools/scripts/update-github-refs.sh` as a compatibility wrapper for update-only GitHub-ref flows.
- Promoted repo-group updates to a tracked default manifest at `tools/manifests/repo-groups.json`, while keeping `repo-groups.example.json` as a sample shape.
- Reclassified `VoltAgent/awesome-design-md` as an optional ability under `repos/abilities/voltagent-awesome-design-md` and updated the local `DESIGN.md` tooling/docs accordingly.
- Updated Workspace Hub to read capability registry data, expose capability lifecycle actions in the UI, and persist a repo layout preference with `split` and `discovery-first` modes.
- Synced the public-facing docs set so the root README, docs index, and older handover notes now all describe Workspace memory, the reviewed-source taxonomy, optional abilities, and the optional `gh auth login` and ServBay stance consistently.
- Added a reusable live Hub acceptance block to `docs/HANDOVER.md` and `repos/workspace-hub/README.md` covering base summary, capability-aware search, repo-details hydration, Workspace memory, Workspace Capabilities, Repo Discovery, and `discovery-first` rendering checks.
- Corrected the legacy compatibility manifest note for `VoltAgent/awesome-design-md` so it no longer points at the old `repos/core/` placement.
- Added `GET /api/capabilities` to `workspace-hub` as a read-only capability snapshot endpoint and surfaced its installed or enabled or reference-only counts directly in the Workspace Capabilities panel.
- Added focused snapshot-stat coverage in `repos/workspace-hub/test/workspace-capabilities.test.ts` and updated the Hub README and handover docs to include the new endpoint in verification and smoke flows.

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
- Implemented Phase 3 portability updates in `repos/workspace-hub/server/runtime-manager.ts` with platform-aware open-target and terminal command resolution for `darwin`, `linux`, and `win32`, plus explicit unsupported-platform and missing-launcher errors.
- Added `repos/workspace-hub/test/runtime-openers.test.ts` to validate opener command resolution and unsupported-platform behavior.
- Confirmed updated local test-suite pass outside sandbox with `pnpm --dir "repos/workspace-hub" test` (`11 passed, 0 failed`).
- Added a split summary path with lightweight diagnostics mode: new `GET /api/workspace/summary/base` route and optional `includeDiagnostics` toggle in workspace summary building.
- Added base-summary test coverage in `repos/workspace-hub/test/workspace-cache-search.test.ts` and confirmed local test-suite pass outside sandbox (`12 passed, 0 failed`).
- Added incremental discovery invalidation in `repos/workspace-hub/server/workspace.ts` by tracking a lightweight repo-tree signature so cached discovery can be reused when unchanged and refreshed automatically when repo folders change.
- Updated workspace cache tests in `repos/workspace-hub/test/workspace-cache-search.test.ts` to verify both repo-tree-driven refresh and explicit cache invalidation behavior.
- Confirmed updated local test-suite pass outside sandbox with `pnpm --dir "repos/workspace-hub" test` (`13 passed, 0 failed`).
- Added async diagnostics batching in `repos/workspace-hub/server/workspace.ts` with a background queue, diagnostics cache TTL, and configurable worker concurrency for full-summary diagnostics refresh.
- Added worker cache-coherency invalidation so refreshed diagnostics propagate to subsequent summary reads.
- Extended `repos/workspace-hub/test/workspace-cache-search.test.ts` with diagnostics warming coverage and confirmed updated local test-suite pass outside sandbox (`14 passed, 0 failed`).
- Added diagnostics freshness state (`fresh`, `warming`, `stale`) to workspace repo summaries and surfaced it in repo list and details UI.
- Updated diagnostics worker coverage to assert `warming -> fresh` transition and reconfirmed local test-suite pass (`14 passed, 0 failed`).
- Updated base-summary diagnostics freshness semantics so `includeDiagnostics: false` reports `skipped` instead of `fresh`, and extended test coverage accordingly.
- Updated the app refresh strategy to prefer `GET /api/workspace/summary/base` for frequent refreshes while hydrating full diagnostics via `GET /api/workspace/summary` when needed.
- Added `src/lib/mergeWorkspaceSummary.ts` to preserve prior diagnostics on base refreshes and avoid unnecessary full-summary fetches.
- Added Workspace Hub observability output (`/api/workspace/observability`) plus `/api/health` extension with diagnostics queue depth, active workers, cache metadata, and last summary build time.
- Expanded repo-tree signature detection in discovery caching to include nested repo hints (`package.json`, `composer.json`, `.git/HEAD`) for better automatic cache refresh behavior.
- Added diagnostics freshness pill styling for `skipped`, `warming`, `stale`, and `fresh`.
- Optimized frontend summary refresh behavior in `repos/workspace-hub/src/app/App.tsx` with soft-refresh dedupe and queued coalescing to avoid overlapping refresh work during bursty live events.
- Added reason-tagged summary requests (`?reason=`) for better tuning visibility.
- Reworked discovery caching in `repos/workspace-hub/server/workspace.ts` from a single cache slot to keyed cache entries so base and full summary caches can coexist without unnecessary cross-eviction.
- Replaced diagnostics-worker-triggered full discovery cache invalidation with diagnostics revision tracking for full-summary freshness checks.
- Expanded observability payload with discovery and diagnostics cache counters plus summary request counts and reason breakdowns.
- Added optimization-focused test coverage in `repos/workspace-hub/test/workspace-cache-search.test.ts` for base cache reuse after diagnostics updates and observability counter behavior.
- Added optimization quick-verify commands and observability guidance to `repos/workspace-hub/README.md`.
- Added a concise operator-facing follow-up section in `repos/workspace-hub/README.md` for observability checks, safe tuning knobs, and triage workflow guidance.
- Added a versioned observability schema (`observabilityVersion: 1`) with grouped `discovery`, `diagnostics`, and `summary` sections while keeping legacy top-level fields as compatibility aliases.

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
