# 18-mcp-server-catalog

## Purpose

This is the curated catalog for the official MCP v1 server set.

Keep it small.

Do not turn this into a rolling list of every MCP server that exists.

## `openaiDeveloperDocs`

- Category: docs/context
- Transport: remote HTTP
- Trust class: `trusted-remote-read`
- Capability tier: `read-only`
- Profiles: `default-full`, `safe-readonly`, `research`
- Why it is included: current OpenAI product and API docs
- Default auth stance: none required
- Notes:
  - keep this as the OpenAI-specific source
  - do not replace it with general package-doc tools

## `context7`

- Category: docs/context
- Transport: remote HTTP
- Trust class: `trusted-remote-read`
- Capability tier: `read-only`
- Profiles: `default-full`, `safe-readonly`, `research`
- Why it is included: up-to-date package and library docs
- Optional env: `CONTEXT7_API_KEY`
- Notes:
  - this is the default library and package docs source
  - use MCP mode here rather than CLI-plus-skill mode

## `playwright`

- Category: browser/runtime inspection
- Transport: local stdio
- Trust class: `local-browser-runtime`
- Capability tier: `read-only`
- Profiles: `default-full`, `browser-debug`
- Why it is included: deterministic browser inspection and browser-driven task flows
- Workspace contract:
  - launch through `tools/scripts/mcp-run-playwright.sh`
  - keep browser binaries under `cache/playwright-browsers`
  - fall back to workspace-owned home, npm-cache, and output directories when the host process exposes an unusable `HOME`
- Notes:
  - avoid hard-coded machine paths in tracked examples

## `chrome-devtools`

- Category: browser/runtime inspection
- Transport: local stdio
- Trust class: `local-browser-runtime`
- Capability tier: `read-only`
- Profiles: `default-full`, `browser-debug`
- Why it is included: DevTools-native runtime inspection
- Workspace contract:
  - launch through `tools/scripts/mcp-run-chrome-devtools.sh`
  - keep the workspace-root contract visible through `WORKSPACE_ROOT`
  - fall back to workspace-owned home and npm-cache directories when the host process exposes an unusable `HOME`
- Notes:
  - this complements Playwright rather than replacing it

## `github`

- Category: repo collaboration
- Transport: remote HTTP
- Trust class: `guarded-remote-write`
- Capability tier: `mutating`
- Profiles: `default-full`, `github-full`
- Why it is included: repository, PR, issue, Actions, and code-security workflows
- Auth:
  - `GITHUB_PAT` when you want bearer-token auth
  - or `codex mcp login github` when OAuth is preferable
- Default toolset stance:
  - use the broad `all` toolsets header in the GitHub profiles for this workspace
- Notes:
  - if you do not need GitHub context or write-capable flows, use `safe-readonly`

## Explicit non-catalog items

These are not part of the official v1 catalog:

- local filesystem MCP servers
- shell/terminal MCP servers
- generic database MCP servers
- broad third-party remote mutation servers
- Figma MCP, which is intentionally deferred to a later batch
