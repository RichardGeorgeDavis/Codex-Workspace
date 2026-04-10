# 17-mcp-install-and-health-check

## Purpose

This note defines the practical install, verify, downgrade, and recovery path
for the official MCP v1 setup.

## Before you start

Recommended local prerequisites:

- `codex`
- `jq`
- `npx` for browser-capable profiles

Tracked examples live in:

- `tools/templates/mcp/`
- `repos/workspace-hub/.workspace/mcp/`

Generated local files live in:

- `tools/local/agents/codex/mcp.env.local`
- `tools/local/agents/codex/mcp.generated.toml`

The installer also updates the managed Codex MCP block inside:

- `~/.codex/config.toml`
- or `$CODEX_HOME/config.toml` when `CODEX_HOME` is set

## Install flow

1. Choose a profile.

```bash
tools/scripts/install-mcp-profile.sh --list
```

2. Optional: prepare local-only auth values.

Examples:

- `CONTEXT7_API_KEY` for higher Context7 rate limits
- `GITHUB_PAT` for GitHub bearer-token auth

The installer creates `tools/local/agents/codex/mcp.env.local` if it does not
already exist.

3. Preview the managed block.

```bash
tools/scripts/install-mcp-profile.sh default-full
```

4. Apply the profile.

```bash
tools/scripts/install-mcp-profile.sh --run default-full
```

5. Run the health check.

```bash
tools/scripts/check-mcp-health.sh --profile default-full
```

## What the installer does

`install-mcp-profile.sh`:

- generates the local overlay under `tools/local/agents/codex/`
- validates the managed TOML block in a temporary Codex home before writing it
- removes any older managed Codex Workspace MCP block from the active Codex config
- appends the new managed block without disturbing unrelated config
- keeps a timestamped backup of the prior active Codex config in `tools/local/agents/codex/`

## Health-check coverage

`check-mcp-health.sh` verifies:

- `codex mcp list --json` returns valid JSON
- the expected servers for the selected profile are present
- tracked profile and server example JSON parses cleanly
- tracked MCP examples do not contain machine-specific absolute paths
- Playwright uses the workspace wrapper and shared browser cache contract
- Chrome DevTools uses the workspace wrapper
- OpenAI Docs and Context7 remain separate docs sources
- GitHub is configured with the broad `all` toolsets header

The browser wrappers also harden one practical edge case:

- if a host process starts the browser MCP server with an unusable `HOME` such as `/`, the wrappers fall back to workspace-owned runtime paths under `cache/` instead of trying to write under the filesystem root

It also reports:

- whether `CONTEXT7_API_KEY` is present in the current shell
- whether GitHub auth is currently available or still needs `GITHUB_PAT` or `codex mcp login github`

## Downgrade and disable

Downgrade to the smallest official profile:

```bash
tools/scripts/install-mcp-profile.sh --run safe-readonly
tools/scripts/check-mcp-health.sh --profile safe-readonly
```

If you need to stop using the workspace-managed block entirely:

1. remove the block manually from `~/.codex/config.toml`
2. keep or delete `tools/local/agents/codex/mcp.generated.toml`
3. keep credentials in local-only files; do not move them into tracked docs or templates

## Common failure modes

- shell-only env vars are not visible to the app you launched from the GUI
- `npx` is missing, so browser profiles cannot launch their stdio servers
- a browser MCP host inherits `HOME=/`; the workspace wrappers now guard this case for the managed Playwright and Chrome DevTools commands
- tracked examples are correct, but the local managed block was not applied with `--run`
- GitHub auth is missing even though the server is configured
- a user expects repo-local `.workspace/mcp/` examples to be live config instead of portable examples
