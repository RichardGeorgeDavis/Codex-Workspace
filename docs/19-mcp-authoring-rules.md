# 19-mcp-authoring-rules

## Purpose

This note defines the minimum quality bar for adding tracked MCP examples to
Codex Workspace.

## Naming rules

Prefer stable job-based names over vendor-hype names.

Good:

- `research`
- `browser-debug`
- `github-full`

Avoid:

- `ultimate-agent-pack`
- `power-mode`
- `everything`

## Support-boundary rule

Do not add a new server to the official workspace set unless:

- the workspace does not already have that capability natively
- the job is common enough to justify a first-class profile or server example
- the trust class is clear
- the downgrade path is documented

## Classification rule

Every tracked MCP example must declare:

- transport type
- trust class
- capability tier
- supported profile or profiles
- local-only env or auth requirements

## Path rule

Tracked examples must never contain:

- machine-specific absolute paths
- hard-coded user home paths
- repo-specific paths that only work on one machine

If a live Codex config needs an absolute path, generate it in the ignored local
overlay instead of committing it.

## Secrets rule

Never commit:

- PATs
- API keys
- private endpoints
- values copied out of local env files

Local-only files are the correct home for real credentials.

## Wrapper rule

When a local stdio MCP server needs workspace-specific behavior, use a
workspace-owned wrapper.

Examples:

- pass `WORKSPACE_ROOT`
- reuse `cache/playwright-browsers`
- keep runtime assumptions explicit

Do not force tracked examples to hard-code the wrapper-resolved absolute path.

## Documentation rule

No tracked profile or server example should land without:

- a usage note
- a trust note
- an auth note when relevant
- a smoke-check path

## Figma rule

Figma is planned later.

Do not add it to the official v1 set until that later batch is ready and the
remote-versus-local default is documented explicitly.
