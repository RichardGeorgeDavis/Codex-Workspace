# Changelog

This changelog records public Codex Workspace framework changes. Private
operator history is maintained outside the public repository.

## 2026-07-27

- Separated private repo launchers, provider helpers, live profiles and
  operator history from the public workspace framework.
- Kept Workspace Hub as the public Finder-launcher example.
- Added explicit profile selection to Loop Engineering and local-model context
  tooling while retaining conservative public defaults.
- Replaced private repository and provider examples with neutral fixtures.
- Sanitised the public SSH Keychain skill and removed personal integration
  skills from the public shared-skill source tree.
- Removed the obsolete Neo4j memory-hooks skill from the public distribution;
  workspace-specific historical copies remain outside the public repository.
- Removed the last accidentally tracked private checkout files under `repos/`;
  only the public `repos/workspace-hub/` implementation remains tracked.

## 2026-07-22

- Added a dry-run-first, local Ollama context handover worker with bounded
  source selection, protected-path handling, structured output, provenance,
  exact-cache reuse and fixture coverage.
- Added optional cloud-provider adapters for explicitly selected, tracked,
  public-safe files. Live provider credentials and routing policy are external
  configuration, not part of the public defaults.

## 2026-07-13

- Added a privacy-first Graphify baseline with pinned setup, dry-run-first repo
  tooling, fixtures and explicit adoption gates.
- Limited the public pilot to Workspace Hub and kept graph output ignored,
  allowlisted and human-reviewed.

## 2026-07-12

- Added Loop Engineering as a dry-run-first controller for bounded repository
  triage, isolated draft worktrees and independent verification.
- Added neutral fixture coverage for dirty worktrees, failed verification,
  locks, forbidden actions and safe cleanup.

## 2026-07-01

- Made Workspace Hub release checks resolve the package manager declared by
  the repo, including a Corepack path and a pinned fallback.
- Updated the health-check harness to use the repo-local TypeScript runtime.

## 2026-06-13

- Removed the previous background workspace-memory service from tracked
  workspace surfaces while retaining generic core-service support in
  Workspace Hub.
- Moved closeout back to tracked documentation and optional context packets.
- Kept publishable skills manifest-managed and retained experimental memory
  hooks as reference-only material.

## 2026-05-10

- Added claim-only TomeVault distribution with root `AGENTS.md` as the public
  contract and a deterministic `.agents/skills/` mirror.
- Hardened Workspace Hub mutation routes with explicit local intent, validated
  canonical repo paths and shared pause-state handling.
- Made sync-noise cleanup dry-run by default and strengthened release-readiness
  checks against stale external status.

## 2026-04-27

- Reduced default agent context load with a concise live handover, archived
  history and explicit token-budget guidance.
- Made archive loading and deep indexed content opt-in in Workspace Hub.

## 2026-04-22

- Confined capability paths to the workspace root and changed lifecycle
  commands from shell strings to structured argument arrays.
- Added cached indexed search, explicit invalidation, a read-only health-check
  endpoint and operator-visible rejected-manifest diagnostics.
- Added opt-in repo-level `DESIGN.md` tooling and templates.

## 2026-04-17

- Added collision-aware local port allocation and a dry-run-first public-site
  reference capture workflow with repo-local provenance notes.

## 2026-04-12

- Added strict runtime payload validation to Workspace Hub repo-intake,
  capability-action and agent-preset flows.

## 2026-04-11

- Released the `v1.2.2` public baseline with generated entry packets,
  manifest-declared entry documents and thin-versus-deep indexed search.
- Improved repo prioritisation, dependency readiness, capability inspection,
  runtime troubleshooting and tool-agnostic public documentation.

## 2026-04-10

- Added the MCP v1 trust and authoring documentation, bounded install and
  health-check scripts, and repo-safe examples.
- Added generated side-load context packets, browser-wrapper hardening and
  Workspace Hub visibility for packet freshness.
- Released the `v1.2.0` and `v1.2.1` framework increments that established
  Hub-first onboarding and the original memory-service adapter surfaces.

## 2026-04-09

- Added the canonical Git and GitHub collaboration baseline without making
  GitHub authentication mandatory.

## 2026-04-08

- Reframed the public README and contributor guidance around a shorter path
  from project overview to roadmap, issue and pull request.
- Added repo-intake guidance for public reference copies and a source-promotion
  taxonomy for reference-only, ability, repo-level and core-service material.
- Added capability lifecycle management and the initial Workspace Hub
  capability and layout controls.

## 2026-04-07

- Added Workspace Hub discovery caching, safe client error responses,
  opt-in artifact indexing, cross-platform opener resolution and focused
  server tests.
- Added base-versus-full summaries, diagnostics freshness, observability and
  coalesced refresh handling.

## 2026-04-05

- Added manifest-managed upstream reference snapshots and opt-in repo-level
  design-context tooling.

## 2026-04-03

- Released the stable Workspace Hub `1.0.0` baseline with repo intake,
  agent-surface detection, repo presets, shared browser caching and a
  non-destructive release-readiness gate.

## 2026-03-26

- Added live Workspace Hub events, lightweight indexed search and local
  structured failure reports.

## 2026-03-23

- Added selective skill sync, workspace diagnostics, setup profiles, MCP
  templates, repo-group updates and optional local job artefacts.

## 2026-03-21

- Established the public project homepage, contributor files, documentation
  index, filesystem-first context model and tracked-versus-local boundaries.

## 2026-03-17

- Consolidated canonical workspace documentation under `docs/` and added
  ignore handling for common macOS metadata.

## 2026-03-16

- Built the initial workspace structure and standalone Workspace Hub with repo
  discovery, conservative classification, runtime actions, metadata overrides
  and repo-native manifests.
