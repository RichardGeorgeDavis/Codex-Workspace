# 16-mcp-profiles

## Purpose

This note is the operator-facing guide to the named MCP bundles in Codex Workspace.

Each profile is a small, documented set of MCP servers with a clear trust and
usage stance.

## Official profiles

### `default-full`

Use when:

- you want the convenience-heavy local default
- you need docs, browser inspection, and GitHub flows available together

Includes:

- `openaiDeveloperDocs`
- `context7`
- `playwright`
- `chrome-devtools`
- `github`

Notes:

- convenience default, not safest default
- GitHub runs with the `all` toolsets header

### `safe-readonly`

Use when:

- you want the smallest official MCP surface
- you only need docs augmentation

Includes:

- `openaiDeveloperDocs`
- `context7`

Notes:

- documented downgrade path from `default-full`
- no browser runtime servers
- no GitHub context or mutation surface

### `browser-debug`

Use when:

- the task is UI-heavy
- you need runtime inspection more than docs or GitHub context

Includes:

- `playwright`
- `chrome-devtools`

Notes:

- Playwright uses the shared workspace browser cache under `cache/playwright-browsers`
- both servers are launched through workspace-owned wrappers

### `research`

Use when:

- you want library/package docs plus OpenAI product docs
- you do not need browser tooling or GitHub access

Includes:

- `openaiDeveloperDocs`
- `context7`

Notes:

- OpenAI Docs remains the OpenAI-specific source
- Context7 remains the package and library docs source

### `github-full`

Use when:

- the task is primarily GitHub-native
- you want repository, PR, issue, Actions, and code-security surfaces without the browser or docs servers

Includes:

- `github`

Notes:

- uses the broad `all` toolsets header
- keep credentials local-only

## Local env and auth expectations

Current optional env vars:

- `CONTEXT7_API_KEY`
- `GITHUB_PAT`

Practical defaults:

- Context7 works without an API key, but rate limits are better with one
- GitHub can use `GITHUB_PAT` or an OAuth login with `codex mcp login github`

If you use the Codex desktop app outside a shell, remember that shell-only env
exports may not be visible to the app unless you launch Codex from that shell
or use another local env-loading path.

## Smoke checks

Use these after installing or changing a profile:

```bash
tools/scripts/install-mcp-profile.sh default-full
tools/scripts/install-mcp-profile.sh --run default-full
tools/scripts/check-mcp-health.sh --profile default-full
```

Other common flows:

```bash
tools/scripts/install-mcp-profile.sh --run safe-readonly
tools/scripts/check-mcp-health.sh --profile safe-readonly
tools/scripts/install-mcp-profile.sh --run browser-debug
tools/scripts/check-mcp-health.sh --profile browser-debug
```
