# 23-codebase-knowledge-graph

## Purpose

Graphify is an optional local code-intelligence layer for repository orientation,
architecture review, and human-written handovers. It does not replace source,
tests, manifests, schemas, or tracked documentation as the source of truth.

The workspace pilot is pinned to Graphify `0.9.11` from the `graphifyy` package.
It runs in an isolated uv tool environment and is not a dependency of Workspace
Hub or any sibling repository.

## Operating boundary

- Graph one repository at a time.
- Keep `graphify-out/` local and ignored.
- Use a reviewed `.graphifyignore`; it takes precedence over `.gitignore`.
- Start with deterministic code extraction only.
- Do not include docs, media, credentials, private data, local state, archives,
  build output, dependencies, or agent artifacts.
- Disable query logging with `GRAPHIFY_QUERY_LOG_DISABLE=1`.
- Do not expose Graphify through MCP or a network service during this pilot.
- Do not build workspace-wide or cross-repo family graphs during this pilot.

## Install and check

```bash
uv tool install --python 3.11 'graphifyy==0.9.11'
tools/scripts/graphify-check.sh
```

Upgrades are reviewed monthly and must repeat the pilot privacy, correctness,
hook, and regression checks before the pinned version changes.

## Generate a repo graph

```bash
tools/scripts/graphify-repo.sh repos/workspace-hub
tools/scripts/graphify-repo.sh --run repos/workspace-hub
```

The first command is a dry run. The second writes only ignored local output.
The wrapper does not install Graphify, create ignore files, or edit a repo.

## Authority and fallback

Treat graph answers as navigation hints. Sample every important relationship
against source before using it in implementation or handover decisions. If the
graph is missing, stale, or disagrees with source, continue with normal repo
inspection and rebuild only after the ignore policy has been reviewed.

## Pilot and expansion

Workspace Hub is the accepted public pilot. Private-repository assessments and
their measured results belong in the operator's private records. The installed
Codex skill can use the host Codex agent for document extraction when
supported; Graphify's direct code-only CLI wrapper does not perform that
semantic work. Expansion still requires the measured gate in the repo handover
or a private operator record. Cross-repo graphs, scheduled automation,
Graphify MCP, codebase-memory-mcp, and Serena remain out of scope.

## Handover refresh

Graphify does not refresh merely because a handover file changes. For an
adopted code-only repo, finish source and tests, finalize the handover, run the
workspace wrapper with `--run`, review the graph, and make no further source
changes without another refresh. A handover-only edit does not change the code
graph; the closeout refresh verifies that the graph matches the accompanying
code state.
