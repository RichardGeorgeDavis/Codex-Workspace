# Handover

## Purpose

This file is the practical handoff summary for the current Codex Workspace state.

Use it after reading the core handover pack when you need to understand:

- what has already been built
- where the canonical docs now live
- what remains to be done next

## Recommended chat handover flow

When starting a fresh chat for repo-aware work, use this order:

1. read this file and the directly relevant tracked README or doc first
2. if you want a cheaper broad-context wake-up, run:
   `tools/scripts/generate-context-cache.sh --workspace --run`
3. for `workspace-hub` work, also run:
   `tools/scripts/generate-context-cache.sh --repo workspace-hub --run`
4. treat generated files under `cache/context/` as optional `L0` and `L1` summaries only
5. trust tracked docs, manifests, and repo files over generated summaries whenever they differ

Suggested instruction for a fresh chat:

> Read `docs/HANDOVER.md` first, then use the generated side-load files under `cache/context/` only as a compact summary layer. If the cache is stale or missing, fall back to the tracked docs.

Current release baseline:

- workspace release tag: `v1.2.1`
- `repos/workspace-hub` version: `1.2.1`
- stable release gate passed on `2026-04-10`

Current published release record:

- release ref: `v1.2.1`
- previous stable release tag: `v1.2.0`
- release URL: `https://github.com/RichardGeorgeDavis/Codex-Workspace/releases/tag/v1.2.1`

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
- `discovery-first` keeps Repo Discovery full width, shows an inline discovery prompt before selection, and expands the selected repo with inline details instead of rendering a second downstream selection block
- indexed search now includes installable capabilities and supports result-type filtering
- Appearance now owns the repo layout toggle while Workspace configuration reflects the active layout and capability counts
- selected repo details now hydrate eager diagnostics through a repo-specific endpoint instead of triggering automatic whole-workspace full-summary hydration
- observability now tracks eager repo-details request counts and timing alongside discovery and diagnostics counters

### Batch 4: Update flow, repo linkage, and maintainer polish

Status: complete and validated

- `update-all.sh` now stays focused on normal repos and skips `repos/abilities/`
- maintainer guidance now lives in `docs/12-maintainer-runbook.md`
- repos are now expected to document any optional ability dependency explicitly

Current likely pickup:

- apply the managed MCP v1 profiles on the machines that need them and use `safe-readonly` versus `default-full` intentionally rather than treating MCP as an always-on hidden dependency
- `repos/workspace-hub` memory-graph Phase 2 only if operators need richer relationship extraction, filtering, or in-app embedding beyond the current file-open flow
- `repos/workspace-hub` capability drill-down if operators need deeper per-capability install/update health than the current snapshot
- `repos/workspace-hub` repo-intake polish if new repos still need clearer first-run notes, optional ability guidance, or tighter starter docs
- keep future batches end-to-end and update this file when a batch becomes the new practical pickup point

## Acceptance closeout (2026-04-10)

This released `v1.2.1` baseline now has a complete verification snapshot:

- `tools/scripts/install-mcp-profile.sh default-full`
- `tools/scripts/check-mcp-health.sh --profile default-full`
- `tools/scripts/manage-workspace-capabilities.sh list`
- `tools/scripts/update-github-refs.sh --list`
- `tools/scripts/update-all.sh --list-groups`
- `pnpm --dir "repos/workspace-hub" lint`
- `pnpm --dir "repos/workspace-hub" typecheck`
- `pnpm --dir "repos/workspace-hub" test`
- `pnpm --dir "repos/workspace-hub" build`

Live Hub acceptance was also exercised against the running app on 2026-04-10:

- `pnpm --dir "repos/workspace-hub" dev:api`
- `pnpm --dir "repos/workspace-hub" dev:web --host 127.0.0.1 --port 4174`
- `curl -s http://127.0.0.1:4101/api/workspace/summary/base | jq ...`
- `curl -s http://127.0.0.1:4101/api/capabilities | jq ...`
- `curl -s "http://127.0.0.1:4101/api/search?q=memory" | jq ...`
- `curl -s -X POST http://127.0.0.1:4101/api/services/context -H 'Content-Type: application/json' -d '{"serviceId":"mempalace","targetKind":"workspace-docs"}' | jq ...`
- `curl -s -X POST http://127.0.0.1:4101/api/services/command -H 'Content-Type: application/json' -d '{"serviceId":"mempalace","commandId":"search","searchQuery":"workspace memory"}' | jq ...`
- `curl -s -X POST http://127.0.0.1:4101/api/services/command -H 'Content-Type: application/json' -d '{"serviceId":"mempalace","commandId":"build-graph"}' | jq ...`
- `curl -s --get http://127.0.0.1:4101/api/repos/details --data-urlencode "relativePath=repos/workspace-hub"`
- `curl -s http://127.0.0.1:4101/api/health | jq '.workspaceHub.repoDetails'`
- `npx playwright screenshot --wait-for-selector 'text=Workspace memory' ...`
- `npx playwright screenshot --wait-for-selector 'text=Workspace Capabilities' ...`
- `npx playwright screenshot --wait-for-selector 'text=Repo Discovery' ...`
- `npx playwright screenshot --load-storage /tmp/workspace-hub-discovery-storage.json --wait-for-selector 'text=Select a repo to open details.' ...`

Observed runtime result:

- the managed Codex Workspace MCP block now validates in a temp Codex home before apply and can be generated into ignored local overlay files under `tools/local/agents/codex/`
- the official MCP v1 support boundary is now documented explicitly around five servers, five profiles, and a one-command downgrade path to `safe-readonly`
- the local Codex config now carries the managed `default-full` MCP block with `openaiDeveloperDocs`, `context7`, `playwright`, `chrome-devtools`, and `github`, while pre-existing non-workspace MCP servers such as `figma` and `xcodebuildmcp` remain intact
- the live MCP health check now passes with `0` warnings and `0` failures after the local MCP env enabled `CONTEXT7_API_KEY` and `GITHUB_PAT` on this machine without changing any tracked files or exposing secret values
- the browser wrappers are now hardened against host sessions that expose `HOME=/`, so the managed Playwright and Chrome DevTools commands fall back to workspace-owned runtime paths under `cache/` instead of writing under the filesystem root
- base summary returned live repo and capability data with list projection active (`detailLevel: list` on summary repos)
- read-only `GET /api/capabilities` returned live installed/enabled/reference-only stats plus capability records with per-capability `updatedAt` state
- indexed search returned both the `MemPalace` service and the `VoltAgent/awesome-design-md` capability for `q=memory`
- Workspace memory target context returned graph metadata for `workspace-docs`, including `lastBuiltAt`, `nodeCount`, and `edgeCount`
- direct `search` command smoke returned live retrieval output for `workspace memory`
- direct `build-graph` command smoke wrote `graph.json`, `graph.html`, and `graph-report.md` under `cache/mempalace/<user>/graphs/workspace-docs/`
- repo-details hydration returned `detailLevel: detail` for `repos/workspace-hub`
- repo-details observability counters incremented after the detail fetch
- browser-level smoke confirmed the live presence of `Workspace memory`, `Workspace Capabilities`, `Repo Discovery`, the discovery-first inline empty-state prompt, and the inline selected-repo details flow
- the Workspace memory page now also exposes an in-app MemPalace search form, latest-query visibility, inline command output, and target-scoped graph actions, so retrieval and graph generation are usable from the Hub instead of being shell-only

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
- `repos/workspace-hub` Workspace memory now includes an in-app retrieval search flow backed by `tools/bin/workspace-memory search`
- `repos/workspace-hub` Workspace memory now also exposes target-scoped graph builds backed by `tools/bin/workspace-memory build-graph`
- release and maintainer steps now explicitly require reviewing public-facing files when workspace-wide features such as Workspace memory land

## Completion review

The workspace now meets the practical stable baseline, but it is still open to normal product iteration.

What appears complete or substantially complete:

- workspace foundation
- shared tooling and caches
- stable Workspace Hub 1.1 baseline
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
- write-heavy `workspace-memory` paths now serialize through a workspace-owned lock under `cache/mempalace/<user>/locks/` so overlapping closeout runs do not fight over the same local MemPalace store
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
- if you need both repo and workspace closeout in one session, run them serially; the wrapper now enforces one write-heavy MemPalace run at a time instead of letting SQLite/Chroma contention leak through
- when the user explicitly asks for a handover update, treat that as an automatic MemPalace closeout trigger instead of a separate optional reminder
- before closing the chat, run a quick `git status` sanity check and confirm any changed public doc surfaces still agree, especially `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and any relevant repo-local README, instead of assuming the handover text alone is enough

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

### Implementation update (2026-04-08, contributor onboarding and public queue packaging)

Completed in the workspace root after the `v1.1.0` release baseline:

1. Reframed the public repo entry path.
   - Updated `README.md` to lead with the concrete `Workspace Hub` product, a minimal quick-start path, contribution entry points, a visible `Looking For Help` section, and a short `Now / Next / Later` roadmap.
   - Reduced the number of first-read links in the public entry surface and moved deeper conceptual material lower in the page.

2. Tightened contributor-facing GitHub surfaces.
   - Reworked `.github/CONTRIBUTING.md` around `Ways To Help`, small versus larger changes, and a lightweight PR path.
   - Updated `.github/SUPPORT.md`, `.github/pull_request_template.md`, and the issue-template chooser to make the README -> roadmap -> issue -> PR path more explicit.
   - Added `.github/ISSUE_TEMPLATE/help_wanted_task.md` for scoped contributor-ready work.

3. Added a contributor roadmap and starter issue queue.
   - Added `docs/13-contributor-roadmap.md` with label taxonomy, current contribution lanes, and a curated set of ready-to-open starter tasks.
   - Updated `docs/README.md` and `docs/CHANGELOG.md` so the new contributor surfaces are part of the canonical docs set.

4. Published the first external-facing GitHub queue from that roadmap.
   - Opened Discussion `#10` for outside review of contributor onboarding and `Workspace Hub` clarity.
   - Opened Issues `#5` through `#9` for empty-state polish, classification visibility, doctor guidance, manifest examples, and capability-panel copy.
   - Opened Issue `#11` to tighten `docs/08-first-run-and-updates.md` so the deeper onboarding flow matches the new Hub-first README path.
   - Added GitHub labels `workspace-hub`, `scripts`, `needs-repro`, and `design`.

Published implementation commit:

- `ff3b38f` `Improve contributor onboarding surfaces`

Pickup notes:

- The broad roadmap item `Clarify the "try Workspace Hub first" path` is now largely complete at the README level.
- The narrower follow-up from GitHub Issue `#11` is now complete in `docs/08-first-run-and-updates.md`, so the deeper first-run doc now matches the Hub-first README funnel.
- Future public issues should stay scoped and contribution-ready rather than mirroring every longer-term internal roadmap note.

### Implementation update (2026-04-10, MemPalace search closeout, onboarding alignment, and graph Phase 1)

Completed across the workspace root and `repos/workspace-hub`:

1. Finished the in-app MemPalace search slice.
   - Finalized the `search` workspace-service command path through `workspace-hub` API wiring, app state, and the Workspace memory page.
   - Latest query and latest search time now hydrate back from `shared/mempalace/<user>/service-state.json` after refresh instead of living only in transient UI state.

2. Closed the deeper onboarding follow-up.
   - Reworked `docs/08-first-run-and-updates.md` so it now starts with the practical `Workspace Hub` try-first path before branching into optional setup profiles.
   - Kept the collaboration baseline in `docs/14-git-and-github-workflow.md` as the shared default and updated the README and docs index wording so the public path stays consistent.

3. Landed Memory Graph Phase 1.
   - Added `tools/bin/workspace-memory build-graph` plus the standalone adapter script `tools/scripts/build-mempalace-graph.mjs`.
   - Graph builds now normalize MemPalace sidecars plus nearby target-scoped markdown into rebuildable artifacts under `cache/mempalace/<user>/graphs/<target-slug>/`.
   - Phase 1 artifacts are:
     - `graph.json`
     - `graph.html`
     - `graph-report.md`

4. Updated Workspace Hub for graph status and actions.
   - The selected memory target context now includes graph metadata: output directory, last build time, node count, edge count, and artifact paths.
   - The Workspace memory page now exposes `Build graph`, `Rebuild graph`, `Open graph`, and `Open graph folder` for the selected target.
   - Graph opening stays target-scoped and workspace-safe; it does not mutate `AGENTS.md` or add a second ingestion engine beside MemPalace.

Verification after this slice:

- `pnpm --dir "repos/workspace-hub" lint`: passed
- `pnpm --dir "repos/workspace-hub" typecheck`: passed
- `pnpm --dir "repos/workspace-hub" test`: passed (`26 passed, 0 failed`)

New focused test coverage:

- `repos/workspace-hub/test/mempalace-memory.test.ts`
  - verifies the `search` command path updates persisted MemPalace service state and hydrates back through core-service reads
  - runs `tools/bin/workspace-memory build-graph workspace-docs` in a temp workspace and verifies target-scoped graph artifacts plus summary counts

Pickup notes:

- The immediate MemPalace UI gap is no longer basic search or first graph generation; the next meaningful graph work is richer filtering, relationship extraction, or in-app embedding only if operators ask for it.
- Capability drill-down and repo-intake polish remain valid later work, but they are no longer ahead of the current memory UX baseline.

### Implementation update (2026-04-10, MCP v1 rollout)

Completed across the workspace root:

1. Turned generic MCP guidance into a concrete operating model.
   - Added the MCP policy pack as `docs/15-mcp-profiles-and-trust-levels.md` through `docs/19-mcp-authoring-rules.md`.
   - Kept the existing `docs/10` through `docs/14` surfaces intact rather than overwriting release, maintainer, contributor, or workflow docs.

2. Shipped the tracked MCP v1 examples.
   - Added named profile examples under `tools/templates/mcp/profiles/`.
   - Added the approved server catalog under `tools/templates/mcp/servers/`.
   - Added a local-only env example under `tools/templates/mcp/env/`.
   - Added repo-safe `.workspace/mcp/` examples for `repos/workspace-hub`.

3. Added a workspace-owned install and health-check path.
   - Added `tools/scripts/install-mcp-profile.sh` to generate a local overlay, validate it in a temp Codex home, and update only the managed Codex Workspace MCP block.
   - Added `tools/scripts/check-mcp-health.sh` to verify tracked examples, active expected servers, wrapper usage, and key auth/toolset assumptions.
   - Added workspace-root-aware wrappers for Playwright and Chrome DevTools so local browser MCP runs inherit `WORKSPACE_ROOT` and the shared Playwright browser cache path.

4. Synced the public docs to the new MCP flow.
   - Updated the root README, docs index, `06-cross-agent-skills-and-mcp.md`, `08-first-run-and-updates.md`, and `12-maintainer-runbook.md` so the official MCP v1 path is discoverable from the normal onboarding and maintainer surfaces.

Verification after this slice:

- `sh -n tools/scripts/mcp-env.sh`: passed
- `sh -n tools/scripts/mcp-run-playwright.sh`: passed
- `sh -n tools/scripts/mcp-run-chrome-devtools.sh`: passed
- `sh -n tools/scripts/install-mcp-profile.sh`: passed
- `sh -n tools/scripts/check-mcp-health.sh`: passed
- `find tools/templates/mcp repos/workspace-hub/.workspace/mcp -name '*.json' -exec jq empty {} \;`: passed
- `sh tools/scripts/install-mcp-profile.sh default-full`: passed
- `sh tools/scripts/install-mcp-profile.sh --run default-full`: passed
- `sh tools/scripts/check-mcp-health.sh --profile default-full`: passed with `0` warnings and `0` failures after the local MCP env enabled `CONTEXT7_API_KEY` and `GITHUB_PAT`

Pickup notes:

- The MCP operating model is now documented and scripted; the next practical step is deciding which machines should actually run `default-full` versus `safe-readonly`.
- Figma MCP stays deferred until a separate profile family is ready, with remote preferred when that later batch starts.

### Implementation update (2026-04-10, Playwright MCP runtime hardening)

Completed in the workspace root:

1. Hardened the managed browser wrappers for bad host env defaults.
   - Updated `tools/scripts/mcp-run-playwright.sh` and `tools/scripts/mcp-run-chrome-devtools.sh` so they no longer trust `HOME=/`.
   - Both wrappers now fall back to workspace-owned runtime paths under `cache/`.
   - The Playwright wrapper now also uses isolated mode plus a stable output directory under `cache/playwright-mcp/`.

Verification after this slice:

- `HOME=/ sh tools/scripts/mcp-run-playwright.sh --doctor`: passed
- `HOME=/ sh tools/scripts/mcp-run-playwright.sh --help`: passed
- `HOME=/ sh tools/scripts/mcp-run-chrome-devtools.sh --doctor`: passed
- launched `tools/scripts/mcp-run-playwright.sh` under `HOME=/` and confirmed the server stayed running instead of exiting immediately: passed

Pickup note:

- The managed browser wrappers are now robust even when the host process exposes an unusable home directory; any remaining Playwright-specific failure inside a separate tool host is no longer caused by the workspace wrapper.
