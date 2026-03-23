# MCP Templates

This folder holds starter templates for tracked MCP examples and local-only adaptation.

These templates follow a few useful patterns without adopting any product-specific stack:

- default to read-only capabilities first
- make mutating capabilities an explicit opt-in
- keep stdio transports quiet so JSON-RPC is not polluted by normal console output
- keep one consistent config shape even if the server can be delivered in multiple ways
- prefer local tracked samples for safe defaults and local-only files for real credentials

## Capability tiers

Use these tier names when documenting or templating future MCP tools:

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

## Stdio hygiene

For MCP servers that use stdio transport, keep the channel clean:

- avoid normal console logging to stdout
- prefer error-only logging when possible
- route human-readable logs to stderr or to a file instead of stdout
- document any required env vars for quiet mode

This prevents transport corruption and makes failures easier to debug.

## Files

- `server-profile.read-only.example.json` is the safe default example
- `server-profile.mutating.example.json` is the explicit opt-in example

These are planning templates, not a strict schema.
