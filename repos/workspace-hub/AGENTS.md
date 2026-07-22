## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- The parent Codex Workspace `AGENTS.md` remains authoritative. Graphify is an optional navigation aid, not workspace memory or a source of truth.
- For codebase questions, first run `GRAPHIFY_QUERY_LOG_DISABLE=1 graphify query "<question>"` when graphify-out/graph.json exists. Use the same environment variable with `graphify path` and `graphify explain`. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Rebuild only through `../../tools/scripts/graphify-repo.sh --run .`; do not run Graphify install, upgrade, semantic extraction, URL ingestion, MCP, watch, wiki, media, family-merge, or network-service commands in this pilot.
- Keep Graphify pinned to `0.9.11`, keep `graphify-out/` ignored, and verify important graph relationships against source.
