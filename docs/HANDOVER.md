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
- MemPalace is now integrated as the first core workspace service under `tools/mempalace` with user-scoped durable state under `shared/mempalace/<user>/`
- installable abilities and core services are now tracked in `tools/manifests/workspace-capabilities.json`
- optional abilities live under `repos/abilities/` rather than the normal repo-group update path

## Current source taxonomy

Use this classification model consistently across the workspace docs and tooling:

- `reference-only` -> `tools/ref/`
- `ability` -> `repos/abilities/<slug>/`
- `repo-level adoption` -> normal `repos/...`
- `core service` -> `tools/<name>/` + `shared/<name>/<user>/` + `cache/<name>/<user>/`

The canonical lifecycle command for installable abilities and core services is:

- `tools/scripts/manage-workspace-capabilities.sh`

`tools/scripts/update-github-refs.sh` remains as the compatibility wrapper for update-only flows.

## Implementation batches

Use end-to-end batches so the next chat can complete one full slice at a time.

Placement convention:

1. workspace-wide batches live in `docs/HANDOVER.md`
2. repo-specific larger work lives in tracked `openspec/changes/.../tasks.md`
3. repos without `openspec/` should keep a short `Next Batches` section in `README.md` or `HANDOVER.md`

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

## Site reference intake note (2026-04-08)

The repo-intake baseline now includes a specific process for public site clone or rip requests when a new repo is added under `repos/`.

Current stance:

- treat the result as one of: deployed mirror, working local reference copy, or clean rebuild
- do not describe a public-site mirror as the original source project
- record source URL, capture date, and acquisition method in `README.md` or `HANDOVER.md`
- if automated capture misses files because of permissions or other blockers, provide the direct asset URLs to the user in chat
- store any user-downloaded fallback files in a repo-local `ref/` folder with source notes
- create a separate rebuild repo if maintainable editing is the real goal

The tracked template for this flow now lives at:

- `tools/templates/repo-docs/README.site-reference.template.md`

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

The next workspace-wide plan is now split into end-to-end batches:

### Batch 1: Docs, taxonomy, and batching contract

Status: complete

- workspace docs now share one classification model: `reference-only`, `ability`, `repo-level adoption`, `core service`
- `gh auth login` is documented as recommended optional maintainer setup
- ServBay remains supported but de-emphasized as optional
- repo-specific batching guidance now points to tracked `openspec/changes/.../tasks.md` or a repo-local `Next Batches` section

### Batch 2: Managed source lifecycle for refs, abilities, and core services

Status: complete

- added `tools/manifests/workspace-capabilities.json`
- added `tools/scripts/manage-workspace-capabilities.sh`
- moved VoltAgent to the optional ability path under `repos/abilities/voltagent-awesome-design-md`
- kept `update-github-refs.sh` as a compatibility wrapper

### Batch 3: Workspace Hub capability surfacing and layout preference

Status: complete and validated, assuming the separate MemPalace Hub work is already landed

- Workspace Hub now reads capability data from the tracked registry
- installable abilities and core services have a dedicated capability panel
- repo layout preference now supports `split` and `discovery-first`
- `discovery-first` keeps Repo Discovery full width and only shows repo details after selection
- indexed search now includes installable capabilities and supports result-type filtering
- settings now make the current layout mode and capability lifecycle path more explicit
- selected repo details now hydrate eager diagnostics through a repo-specific endpoint instead of triggering automatic whole-workspace full-summary hydration
- observability now tracks eager repo-details request counts and timing alongside discovery and diagnostics counters

### Batch 4: Update flow, repo linkage, and maintainer polish

Status: complete and validated

- `update-all.sh` now stays focused on normal repos and skips `repos/abilities/`
- maintainer guidance now lives in `docs/12-maintainer-runbook.md`
- repos are now expected to document any optional ability dependency explicitly

## Acceptance closeout (2026-04-08)

This alignment slice now has a complete verification snapshot:

- `tools/scripts/manage-workspace-capabilities.sh list`
- `tools/scripts/update-github-refs.sh --list`
- `tools/scripts/update-all.sh --list-groups`
- `pnpm --dir "repos/workspace-hub" lint`
- `pnpm --dir "repos/workspace-hub" typecheck`
- `pnpm --dir "repos/workspace-hub" test`
- `pnpm --dir "repos/workspace-hub" build`

Live Hub acceptance was also exercised against the running app on 2026-04-08:

- `pnpm --dir "repos/workspace-hub" dev:api`
- `pnpm --dir "repos/workspace-hub" dev:web --host 127.0.0.1 --port 4174`
- `curl -s http://127.0.0.1:4101/api/workspace/summary/base | jq ...`
- `curl -s http://127.0.0.1:4101/api/capabilities | jq ...`
- `curl -s "http://127.0.0.1:4101/api/search?q=memory" | jq ...`
- `curl -s --get http://127.0.0.1:4101/api/repos/details --data-urlencode "relativePath=repos/workspace-hub"`
- `curl -s http://127.0.0.1:4101/api/health | jq '.workspaceHub.repoDetails'`
- `npx playwright screenshot --wait-for-selector 'text=Workspace memory' ...`
- `npx playwright screenshot --wait-for-selector 'text=Workspace Capabilities' ...`
- `npx playwright screenshot --wait-for-selector 'text=Repo Discovery' ...`
- `npx playwright screenshot --load-storage /tmp/workspace-hub-discovery-storage.json --wait-for-selector 'text=Selection required' ...`

Observed runtime result:

- base summary returned live repo and capability data with list projection active (`detailLevel: list` on summary repos)
- read-only `GET /api/capabilities` returned live installed/enabled/reference-only stats plus capability records with per-capability `updatedAt` state
- indexed search returned both the `MemPalace` service and the `VoltAgent/awesome-design-md` capability for `q=memory`
- repo-details hydration returned `detailLevel: detail` for `repos/workspace-hub`
- repo-details observability counters incremented after the detail fetch
- browser-level smoke confirmed the live presence of `Workspace memory`, `Workspace Capabilities`, `Repo Discovery`, and the `discovery-first` empty-selection state

Current operator expectation:

- use `manage-workspace-capabilities.sh` for installable abilities and core services
- use `update-all.sh` only for normal repos
- treat `gh auth login` as optional maintainer setup rather than baseline clone/setup

Repo dependency rollout note:

- `repos/workspace-hub` docs now state that optional workspace abilities must be documented explicitly and must not be treated as hidden repo dependencies
- `repos/workspace-hub/README.md` now carries a repo-local `Next Batches` section for future end-to-end pickup
- `repos/workspace-hub` indexed search now surfaces capabilities as a first-class workspace result type
- `repos/workspace-hub` now keeps list refresh on the base summary path while hydrating the selected repo eagerly for richer diagnostics
- `repos/workspace-hub` now exposes a dedicated read-only capability snapshot endpoint and shows installed or enabled or reference-only capability counts directly in the capability panel
- release and maintainer steps now explicitly require reviewing public-facing files when workspace-wide features such as Workspace memory land

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

What still reads as open or incomplete in the docs:

- deeper repo diagnostics and drill-down polish
- favourites and last-opened polish
- clearer dependency-readiness feedback
- fuller ServBay-aware polish beyond the current optional stance
- additional runtime troubleshooting documentation

## Core memory decision (2026-04-08)

MemPalace is now being treated as a core workspace service rather than as a normal repo under `repos/`.

Decision:

- forked runtime code should live in `tools/mempalace`
- durable per-user memory should live in `shared/mempalace/<user>/`
- disposable artifacts should live in `cache/mempalace/<user>/`
- Workspace Hub should surface MemPalace as a core service with its own page and search integration

This decision is now captured in:

- `docs/11-core-memory-and-reference-promotion.md`

The current snapshot under `tools/ref/mempalace-main/` should be treated as reviewed source material only, not as the long-term operational copy.

That document now also defines the intake process for any new GitHub URL or `tools/ref/` addition so future users can classify a source as `reference-only`, `repo-level adoption`, or `core workspace service` before choosing where it lives in the workspace.

Implemented in this slice:

- `tools/mempalace` cloned and locally installed
- `tools/bin/workspace-memory`, `tools/bin/mempalace-start`, and `tools/bin/mempalace-sync`
- conversation ingest wrappers including `workspace-memory mine-convos`, `workspace-memory mine-codex`, and `workspace-memory mine-codex-current`
- closeout wrappers including `workspace-memory save-repo`, `workspace-memory save-workspace`, and `workspace-memory export-codex`
- bootstrap and doctor support for the service
- initial Workspace Hub core-service model and searchable service metadata
- repo/docs target metadata moved under `.workspace/mempalace/` instead of target roots
- default filtered repo mining to reduce low-signal corpus content
- a dedicated Workspace Hub MemPalace page with target context and safe command surface
- a direct `Workspace memory` header switch in Workspace Hub so the page is reachable without opening the Core Services card first

Current closeout expectation:

- after meaningful repo work, use `tools/bin/workspace-memory save-repo <repo-name>`
- after workspace-doc or planning work, use `tools/bin/workspace-memory save-workspace`
- use `tools/bin/workspace-memory export-codex current` when a readable transcript bundle should be kept alongside the mined raw session

These commands work without Workspace Hub running because they operate directly on the local MemPalace wrapper and the Codex session files under `~/.codex/sessions`.

Current operator entry points:

- in Workspace Hub, use the `Workspace memory` header switch
- in shell or chat, use the safe wrappers under `tools/bin/workspace-memory`

Current MemPalace next-step note:

- the wake-up summary issue is now explicitly treated as a corpus-quality problem, not a runtime-plumbing problem
- default repo mining should exclude lockfiles, generated output, vendor/build output, and other low-signal material unless an operator explicitly opts into a raw scan
- the Hub memory page should remain the workspace-level place for service state, target context, and safe wrapper commands
- `wake-up` is substantially cleaner now, but may still occasionally surface config-heavy files such as `tsconfig.node.json`
- later automation for recurring saves and later exporters for more conversation sources are still future work

## Reading order from here

If continuing implementation, read in this order:

1. `10-release-readiness.md`
2. `CHANGELOG.md`
3. `11-core-memory-and-reference-promotion.md`
4. `03-workspace-hub-build-spec.md`
5. `../../repos/workspace-hub/README.md` if working inside the Hub repo

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

### Implementation update (2026-04-07, first slice complete)

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

### Implementation update (2026-04-07, diagnostics freshness indicator slice)

Completed in `repos/workspace-hub`:

1. Added diagnostics freshness state on repo records.
   - `WorkspaceRepo` now includes `diagnosticsFreshness` with values: `fresh`, `warming`, `stale`.

2. Surfaced freshness in UI.
   - Added freshness status pills to repo cards in `RepoSnapshot`.
   - Added a diagnostics freshness row in `RepoDetails` overview.

3. Defined freshness transitions in summary generation.
   - `warming`: first full-summary read before diagnostics cache is warm
   - `stale`: expired diagnostics returned while background refresh is queued
   - `fresh`: warm diagnostics cache or intentionally skipped diagnostics mode

4. Extended worker test assertions.
   - `workspace-cache-search` test now validates `warming -> fresh` transition during async diagnostics warmup.

Verification after diagnostics freshness slice:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed (`14 passed, 0 failed`, duration ~`2337ms`)

### Implementation update (2026-04-07, recommendations applied slice)

Completed in `repos/workspace-hub`:

1. UI refresh split now prefers base summary and hydrates full diagnostics when needed.
   - App refreshes now use `GET /api/workspace/summary/base` as the fast path for high-frequency updates.
   - Initial load and fallback hydration still use `GET /api/workspace/summary` for full diagnostics.
   - Added `src/lib/mergeWorkspaceSummary.ts` to retain previously known diagnostics during base refreshes.

2. Base-summary diagnostics freshness is now explicit.
   - `diagnosticsFreshness` now supports `skipped` and base mode reports `skipped` when diagnostics are intentionally omitted.
   - Updated tests in `repos/workspace-hub/test/workspace-cache-search.test.ts` to assert `skipped` behavior.

3. Observability was added for diagnostics and cache tuning.
   - New endpoint: `GET /api/workspace/observability`.
   - `/api/health` now includes `workspaceHub` observability payload with queue depth, active diagnostics jobs, cache metadata, and last summary build time.

4. Repo-tree signature depth was expanded.
   - Discovery cache signature now includes nested repo hints (`package.json`, `composer.json`, `.git/HEAD`) under top-level `repos/` entries.
   - This improves automatic refresh detection without requiring explicit invalidation for common nested changes.

5. UI diagnostics freshness styling was completed.
   - Added status-pill variants for `skipped`, `warming`, `stale`, and `fresh` so diagnostics state is visually distinct.

Verification after recommendations-applied slice:

- `pnpm --dir "repos/workspace-hub" test`: passed (`14 passed, 0 failed`)
- `pnpm --dir "repos/workspace-hub" typecheck`: passed

### Implementation update (2026-04-07, optimization and observability slice)

Completed in `repos/workspace-hub`:

1. Frontend refresh coalescing and merge efficiency.
   - Added soft-refresh in-flight dedupe and queued coalescing in `src/app/App.tsx` so bursty event streams do not trigger overlapping base refreshes.
   - Added hydration cooldown suppression tracking and a non-blocking telemetry signal for suppressed hydration attempts.
   - Kept base-first refresh strategy and reduced unnecessary object churn by returning the unmodified summary object when diagnostics merge produces no changes in `src/lib/mergeWorkspaceSummary.ts`.

2. Discovery cache structure and diagnostics invalidation behavior.
   - Replaced single discovery cache slot with keyed cache entries so base and full summary caches can coexist.
   - Diagnostics worker completion now increments a diagnostics revision instead of fully clearing discovery cache.
   - Full summary cache entries are invalidated logically by diagnostics revision checks; base summaries continue to reuse valid discovery cache entries.

3. Observability counters and request reason tracking.
   - Added counters for discovery cache hits/misses, diagnostics cache hit-state distribution, summary request totals, and reason breakdown.
   - Added summary request reason support on both summary routes (`?reason=...`) and wired frontend calls with explicit reasons.
   - Added a versioned observability response shape (`observabilityVersion: 1`) with grouped sections: `discovery`, `diagnostics`, and `summary`.
   - Retained existing top-level observability fields as compatibility aliases for current clients.

4. Test coverage expansion.
   - Extended `repos/workspace-hub/test/workspace-cache-search.test.ts` with:
     - base cache reuse after diagnostics worker updates
     - observability counter assertions for discovery and diagnostics cache behavior

Verification after optimization slice:

- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed (`16 passed, 0 failed`)

Measured timing snapshot (5 requests each, local run):

- pre-change:
  - base summary avg ~`269.72ms` (cold-first outlier ~`1333.96ms`, warm ~`3-4ms`)
  - full summary avg ~`15.57ms`
- post-change:
  - base summary avg ~`279.97ms` (cold-first outlier ~`1385.64ms`, warm ~`3-4ms`)
  - full summary avg ~`15.36ms`

Interpretation:

- warm path remains fast and stable
- cold-first request still dominates average in small samples
- new counters now make refresh/caching behavior inspectable for larger-window tuning

### Implementation update (2026-04-08, workspace capability lifecycle and Hub alignment)

Completed in the workspace root:

1. Added a tracked workspace capability registry and lifecycle command.
   - Added `tools/manifests/workspace-capabilities.json`.
   - Added `tools/scripts/manage-workspace-capabilities.sh`.
   - Installable abilities and core services now share one lifecycle surface for `list`, `install`, `update`, `enable`, `disable`, and `uninstall`.

2. Kept repo-group updates focused on normal repos.
   - Added `tools/manifests/repo-groups.json`.
   - Updated `tools/scripts/update-all.sh` to use that tracked manifest by default.
   - `update-all.sh` now skips `repos/abilities/` and points operators to the capability lifecycle command for installable abilities and core services.

3. Reclassified `VoltAgent/awesome-design-md` as an optional ability.
   - Removed it from `tools/manifests/reference-sources.json`.
   - Moved the managed checkout to `repos/abilities/voltagent-awesome-design-md`.
   - Updated `tools/scripts/use-design-md.sh` so the local `DESIGN.md` catalog rebuilds from that managed repo clone.

4. Updated Workspace Hub for the new capability model.
   - Added capability registry loading and action routes on the server.
   - Added a capability panel in the Hub UI.
   - Added persisted repo layout preference with `split` and `discovery-first`.
   - In `discovery-first`, Repo Discovery stays full width and repo details appear only after explicit selection.

Verification for this slice:

- `tools/scripts/manage-workspace-capabilities.sh list`: passed
- `tools/scripts/update-github-refs.sh --list`: passed
- `tools/scripts/update-github-refs.sh --run voltagent-awesome-design-md`: compatibility path retained
- `tools/scripts/update-all.sh --list-groups`: passed
- `tools/scripts/use-design-md.sh --list`: passed
- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed (`21 passed, 0 failed`)
- `pnpm --dir "repos/workspace-hub" build`: passed

Pickup notes:

- If a user asks to manage installable abilities or core services, use `tools/scripts/manage-workspace-capabilities.sh`.
- If a user asks only to run the older update-only GitHub ref flow, `tools/scripts/update-github-refs.sh` remains available.
- Snapshot-style refs still land under `tools/ref/`.
- Managed upstream repos can live under `repos/abilities/` or normal `repos/`, but they remain independent repos.
- performance and expansion changes stay aligned with workspace baseline rules
