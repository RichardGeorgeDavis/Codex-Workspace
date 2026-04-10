# MCP Templates

This folder now holds the tracked MCP v1 planning and install examples for Codex Workspace.

Use it for:

- official workspace profile definitions
- the small approved server catalog
- repo-safe portable examples
- local-only env templates that can be copied into ignored files

The official supported v1 server set is intentionally small:

- `openaiDeveloperDocs`
- `context7`
- `playwright`
- `chrome-devtools`
- `github`

Do not treat this folder as an invitation to add an MCP marketplace.

## Layout

- `profiles/` contains the named workspace profiles
- `servers/` contains one portable definition per approved server
- `env/` contains local-only env examples for credentials and overrides
- `server-profile.read-only.example.json` remains the generic safe default
- `server-profile.mutating.example.json` remains the generic explicit opt-in example

## Capability tiers

Use these tier names when documenting tracked MCP examples:

- `read-only`
- `mutating`

Suggested meaning:

- `read-only` may inspect, search, validate, summarize, or lint
- `mutating` may create, update, delete, deploy, trigger side effects, or write outside a disposable workspace

Default to `read-only`.

Only move to `mutating` when:

- the workflow actually needs side effects
- credentials are configured in local-only files or environment variables
- the operator understands the blast radius

## Trust classes

Use these trust classes in the v1 docs and tracked examples:

- `trusted-remote-read`
- `local-browser-runtime`
- `guarded-remote-write`

## Stdio hygiene

For MCP servers that use stdio transport, keep the channel clean:

- avoid normal console logging to stdout
- prefer error-only logging when possible
- route human-readable logs to stderr or to a file instead of stdout
- document any required env vars for quiet mode

This prevents transport corruption and makes failures easier to debug.

## Local overlays

Tracked examples stop here.

Real Codex MCP config and real credentials should live in ignored local files such as:

- `tools/local/agents/codex/mcp.env.local`
- `tools/local/agents/codex/mcp.generated.toml`

Use `tools/scripts/install-mcp-profile.sh` to generate the local overlay and update the managed Codex MCP block.
