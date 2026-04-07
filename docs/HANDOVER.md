# Handover

## Purpose

This file is the practical handoff summary for the current Codex Workspace state.

Use it after reading the core handover pack when you need to understand:

- what has already been built
- where the canonical docs now live
- what remains to be done next

Current release baseline:

- workspace release tag: `v1.0.0`
- `repos/workspace-hub` version: `1.0.0`
- stable release gate passed on `2026-04-03`

## Canonical doc location

The canonical handover Markdown now lives in:

```text
docs/
```

The `shared/` folder now holds workspace metadata such as:

- `shared/repo-index.json`
- `shared/standards.md`

## Current workspace state

The workspace foundation is in place and released as a stable baseline:

- `docs/`, `repos/`, `tools/`, `cache/`, and `shared/` exist
- shared cache paths and helper conventions exist
- shared helper scripts exist under `tools/scripts/`
- template files exist under `tools/templates/`
- the handover pack now lives under `docs/`
- reviewed upstream references have been promoted into tracked workspace features, docs, templates, and skills
- `tools/ref/` is reference-only and can remain empty until explicitly repopulated

## Current Workspace Hub state

The `repos/workspace-hub/` repo is independently runnable and now represents the stable local dashboard baseline.

Implemented so far:

- repo discovery across sibling repos under `repos/`
- conservative repo classification
- manifest-aware repo metadata
- repo-local agent tooling detection for `AGENTS.md`, `.codex/`, `.agents/skills/`, `.opencode/`, and `.omx/`
- repo-local agent preset scaffolding for Codex baseline, OMX-ready, OpenCode, and all-in-one flows
- repo intake scaffolding for `README.md`, cover placeholders, and conditional manifest creation
- open actions for repo, README, manifest, preview, and terminal
- start, stop, and restart runtime controls
- health checks for local URLs
- lightweight direct local preview bootstrapping for static repos
- persisted per-repo metadata overrides
- manifest authoring for `.workspace/project.json`
- live event streaming, local indexed search, and structured failure reports
- fixture-based tests for agent tooling and preset scaffolding
- repo-local documentation under `repos/workspace-hub/docs/`

## Repo intake notes

The current repo intake flow in `workspace-hub` is intentionally conservative.

- it uses the tracked templates in `tools/templates/repo-docs/`
- it creates or normalizes `README.md`
- it injects the Workspace Hub cover block and ensures a repo-local placeholder cover image exists
- it writes `.workspace/project.json` only when the repo appears to need explicit runtime metadata
- it keeps an existing manifest if one is already present
- it does not auto-install dependencies or auto-start runtimes as part of intake

This keeps intake focused on first-pass repo clarity rather than hidden setup side effects.

## Release verification status

The stable release gate has already been exercised successfully:

- `tools/scripts/bootstrap-workspace.sh --run`
- `tools/scripts/doctor-workspace.sh`
- `tools/scripts/doctor-agent-tooling.sh`
- `tools/scripts/release-readiness.sh`
- live Workspace Hub smoke checks for:
  - one direct-preview repo
  - one external WordPress repo
  - one mixed-stack SwiftPM repo

## Recommended pickup point

The most practical next product step is:

1. Keep the stable release gate current as new workspace features land
2. Tighten richer diagnostics in `workspace-hub` for dependency and runtime edge cases
3. Add release-note and maintenance polish rather than more foundational restructuring

The next useful docs step is:

1. Expand runtime troubleshooting and operator guidance under `repos/workspace-hub/docs/`
2. Keep `docs/10-release-readiness.md` and this handover note aligned after each release-worthy change

## Completion review

The workspace now meets the practical stable baseline, but it is still open to normal product iteration.

What appears complete or substantially complete:

- workspace foundation
- shared tooling and caches
- stable Workspace Hub 1.0 baseline
- repo discovery
- repo detection
- manifest support
- core repo actions
- runtime start or stop flows
- persisted metadata
- manifest authoring
- stable release gate and docs
- shared skill sources and agent tooling support
- shared Playwright browser cache support

What still reads as open or partial in the docs:

- richer repo diagnostics
- favourites and last-opened polish
- clearer dependency-readiness feedback
- fuller ServBay-aware polish beyond the current optional stance
- additional runtime troubleshooting documentation

## Reading order from here

If continuing implementation, read in this order:

1. `10-release-readiness.md`
2. `CHANGELOG.md`
3. `03-workspace-hub-build-spec.md`
4. `../../repos/workspace-hub/README.md` if working inside the Hub repo

## Project review addendum (2026-04-07)

This addendum captures the latest implementation review of `repos/workspace-hub` and should be treated as the current technical pickup note.

### Findings (ordered by severity)

1. High: workspace summary refreshes can become expensive at scale.
   - `buildWorkspaceSummary()` triggers full discovery and per-repo checks repeatedly.
   - `buildRepoRecord()` performs health probes and Git checks for each repo during summary generation.
   - SSE-driven UI refresh behavior increases the cost of this pattern as workspace size grows.

2. Medium: API error responses currently return raw internal error messages.
   - The global Express error middleware sends `error.message` to clients.
   - This may expose internal path or command details that should remain server-side.

3. Medium: open-target behavior is currently macOS-first.
   - `openTarget()` and `openInTerminal()` rely on `open` and `open -a Terminal`.
   - This limits portability for Linux and Windows operator environments.

4. Medium: indexed search includes agent artifact cache content.
   - Search indexing reads files from `cache/context/agents/jobs`.
   - This may surface sensitive local notes or job output in UI search results.

5. Low: test coverage does not yet match backend feature surface.
   - Existing tests focus primarily on agent tooling and preset scaffolding.
   - Runtime manager, preview readiness, and workspace search paths need broader coverage.

### Prioritized plan

1. Phase 1 (stability and performance)
   - Introduce summary/discovery caching with explicit invalidation on repo actions.
   - Split summary generation into fast baseline data and slower deep diagnostics.

2. Phase 2 (security and privacy)
   - Sanitize API 500 responses for client payloads and keep internal details server-side.
   - Add explicit controls for indexing artifact content (opt-in preferred).

3. Phase 3 (portability)
   - Add OS-aware adapters for open and terminal actions across `darwin`, `linux`, and `win32`.
   - Provide clear fallback messages when no supported opener is available.

4. Phase 4 (quality and confidence)
   - Expand tests for runtime lifecycle behavior, search indexing and ranking, and preview polling edge cases.

### Immediate implementation improvements

- Add a `safeErrorMessage()` helper for API responses and keep detailed errors in server logs only.
- Add memoization and lightweight invalidation for workspace discovery results.
- Debounce or scope health probing so non-selected repos are not probed on every refresh.
- Add `WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS` (default `false`) to control artifact indexing.
- Add targeted tests for:
  - runtime start, stop, restart, and failure-report writing
  - search result scoring and artifact opt-in behavior
  - preview reachability timeout and retry handling

### Verification snapshot from review run

- `pnpm lint`: passed in `repos/workspace-hub`
- `pnpm typecheck`: passed in `repos/workspace-hub`
- `pnpm test`: passed outside sandbox in local terminal (`5 passed, 0 failed`)

### Pre-Codex checklist (do now, low risk)

These are practical tasks that can be completed before switching back to Codex implementation mode so later review has clearer evidence and less context rebuilding.

1. Run tests outside sandbox and capture output.
   - Run `pnpm --dir "repos/workspace-hub" test` in a normal local terminal.
   - Paste or summarize pass/fail output into this handover section.
   - Goal: remove uncertainty from the current sandbox-only `EPERM` test block.

2. Add a short baseline performance snapshot.
   - Record timings for `GET /api/workspace/summary` with current repo count (for example 5 runs, cold and warm).
   - Note repo count and average response time in this file.
   - Goal: create a measurable before-state for caching and summary optimization work.

3. Confirm privacy stance for artifact indexing.
   - Decide whether agent artifact indexing should be default-on or default-off.
   - If default-off is preferred, note the intended env flag name and default here before implementation.
   - Goal: lock product intent before code changes.

4. Lock portability expectation for open actions.
   - Confirm target support scope (`darwin` only for now, or `darwin` + `linux` + `win32`).
   - Document expected behavior when platform opener is unavailable.
   - Goal: avoid ambiguous cross-platform behavior during implementation.

5. Define test expansion minimum for the next change set.
   - Require at least one test for runtime lifecycle, one for search indexing behavior, and one for preview readiness timeout handling.
   - Record the intended test file names before implementation starts.
   - Goal: ensure backend feature growth comes with proportionate coverage.

### Codex review handoff prompt (ready to reuse)

Use this prompt when resuming in Codex to keep implementation aligned with this review:

"Implement Phase 1 and Phase 2 items from `docs/HANDOVER.md` project review addendum: (1) summary/discovery caching with clear invalidation on repo actions, (2) safe client-facing API error messaging, and (3) artifact-index gating via env flag. Keep behavior backward-compatible, add focused tests for changed server modules, and update handover verification notes with timing and test results."

### Implementation update (2026-04-07, first slice completed)

Completed in `repos/workspace-hub`:

1. Summary and discovery caching with explicit invalidation.
   - Added snapshot-keyed discovery cache in `server/workspace.ts` with configurable TTL via `WORKSPACE_HUB_DISCOVERY_CACHE_TTL_MS` (default `1500` ms).
   - Added `invalidateWorkspaceSummaryCache()` and wired invalidation through mutating routes in `server/index.ts` (open activity, runtime actions, install, cover, intake, metadata, manifest, presets, stop-all).

2. Safer client-facing API error behavior.
   - Updated global error middleware in `server/index.ts` to log internal error details server-side and return a generic 500 response message to clients.

3. Artifact-index gating for search.
   - Added `WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS` in `server/workspace-search.ts`.
   - Artifact indexing is now opt-in; default behavior excludes agent-job artifact files from search documents.

Verification after implementation:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed outside sandbox in local terminal (`5 passed, 0 failed`, duration ~`2798ms`)

Follow-up tests added for this slice:

- `repos/workspace-hub/test/workspace-cache-search.test.ts`
  - verifies workspace summary cache behavior stays stable before explicit invalidation and refreshes after `invalidateWorkspaceSummaryCache()`
  - verifies artifact search indexing remains disabled by default and only returns artifact results when `WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS=true`

### Implementation update (2026-04-07, Phase 3 portability slice)

Completed in `repos/workspace-hub`:

1. Platform-aware open command resolution.
   - Added platform-specific resolver functions in `server/runtime-manager.ts` for open-target and terminal actions.
   - Current mappings:
     - `darwin`: `open` (+ `-a Terminal` for terminal open)
     - `linux`: `xdg-open` for open-target, and `x-terminal-emulator` / `gnome-terminal` / `konsole` for terminal open when available
     - `win32`: `cmd /c start` patterns for open-target and terminal open

2. Explicit unsupported-platform and missing-launcher errors.
   - Open and terminal actions now throw clear errors when the platform is unsupported or required launchers are unavailable.

3. Focused portability test coverage.
   - Added `repos/workspace-hub/test/runtime-openers.test.ts` for resolver behavior on supported and unsupported platforms.

Verification after Phase 3:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed outside sandbox in local terminal (`11 passed, 0 failed`, duration ~`2886ms`)

### Implementation update (2026-04-07, base summary split slice)

Completed in `repos/workspace-hub`:

1. Added a lightweight summary endpoint.
   - New API route: `GET /api/workspace/summary/base`
   - Uses `buildWorkspaceSummary(..., { includeDiagnostics: false })`.

2. Added diagnostics toggle for summary generation.
   - `buildWorkspaceSummary()` now accepts optional `{ includeDiagnostics?: boolean }` (default remains full diagnostics).
   - Base mode preserves repo discovery while skipping heavier probes.

3. Added base-mode behavior and coverage.
   - Base mode returns conservative diagnostics placeholders:
     - health: `unknown`
     - git: `unavailable` with skipped-summary note
     - dependencies: `unknown` with skipped-summary note
   - Added test coverage in `repos/workspace-hub/test/workspace-cache-search.test.ts`.

Verification after base-summary slice:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed outside sandbox in local terminal (`12 passed, 0 failed`, duration ~`3114ms`)

### Implementation update (2026-04-07, incremental discovery invalidation slice)

Completed in `repos/workspace-hub`:

1. Added repo-tree signature based cache reuse.
   - Workspace discovery cache now tracks a lightweight `repos/` tree signature (root + immediate child directory stats).
   - Cached discovery can be reused past TTL when snapshot state and repo-tree signature are unchanged.

2. Added automatic refresh trigger on repo-tree changes.
   - Discovery now re-runs when repo tree signature changes (for example, new repo folder appears), even without explicit cache invalidation.

3. Preserved explicit invalidation behavior.
   - `invalidateWorkspaceSummaryCache()` remains supported for guaranteed refresh in action flows.

4. Updated cache behavior tests.
   - `repos/workspace-hub/test/workspace-cache-search.test.ts` now verifies:
     - summary refresh when repo tree changes
     - explicit invalidation still forces refresh

Verification after incremental invalidation slice:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed outside sandbox in local terminal (`13 passed, 0 failed`, duration ~`2518ms`)

### Implementation update (2026-04-07, diagnostics batching worker slice)

Completed in `repos/workspace-hub`:

1. Added background diagnostics batching.
   - `server/workspace.ts` now queues and processes diagnostics refresh work asynchronously with configurable concurrency.
   - New env controls:
     - `WORKSPACE_HUB_DIAGNOSTICS_WORKER_CONCURRENCY` (default `4`)
     - `WORKSPACE_HUB_DIAGNOSTICS_CACHE_TTL_MS` (default `10000`)

2. Added diagnostics cache semantics for full summary mode.
   - Full summary reads now return quickly with:
     - warm cached diagnostics when fresh
     - stale diagnostics while a background refresh is queued
     - conservative placeholders on first hit while diagnostics warm asynchronously

3. Added cache-coherency fix after worker refresh.
   - When worker refresh completes, it now invalidates workspace summary cache so the next summary read can surface updated diagnostics.

4. Added and validated worker-focused test coverage.
   - Extended `repos/workspace-hub/test/workspace-cache-search.test.ts` with async diagnostics warming coverage.

Verification after diagnostics worker slice:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed outside sandbox in local terminal (`14 passed, 0 failed`, duration ~`2864ms`)
