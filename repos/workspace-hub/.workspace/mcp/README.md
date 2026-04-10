# Workspace Hub MCP Examples

This folder holds repo-safe MCP examples for `repos/workspace-hub`.

Use these as portable examples only:

- keep real credentials in ignored local files
- keep machine-specific absolute paths out of tracked examples
- prefer the workspace wrappers under `tools/scripts/` when a Codex MCP server needs `WORKSPACE_ROOT` or the shared Playwright browser cache

The workspace-level MCP policy and supported-server set live in:

- `docs/15-mcp-profiles-and-trust-levels.md`
- `docs/16-mcp-profiles.md`
- `docs/17-mcp-install-and-health-check.md`
- `docs/18-mcp-server-catalog.md`
- `docs/19-mcp-authoring-rules.md`

For `workspace-hub`, the most relevant portable profiles are:

- `browser-debug` when you want UI/runtime inspection
- `research` when you want OpenAI Docs plus Context7 without browser tooling
