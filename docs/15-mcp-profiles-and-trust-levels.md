# 15-mcp-profiles-and-trust-levels

## Purpose

This note defines the official MCP v1 operating model for Codex Workspace.

It complements the placement guidance in `06-cross-agent-skills-and-mcp.md` by
answering the practical questions that a contributor or maintainer should not
have to guess:

- which MCP servers are officially supported
- which profiles exist
- which trust class each server belongs to
- where tracked examples end and local-only config begins

## Official v1 support boundary

Codex Workspace officially supports only these MCP servers in v1:

- `openaiDeveloperDocs`
- `context7`
- `playwright`
- `chrome-devtools`
- `github`

Do not add extra filesystem, shell, database, or general-purpose mutation MCP
servers to the official workspace set.

Reason:

- Codex already has native shell and filesystem access in this workspace
- extra general-purpose MCP servers would add tool noise without adding much new capability
- the workspace needs a predictable operating model, not an MCP marketplace

Figma local and remote MCP are intentionally deferred to a later batch.
When that batch happens, prefer the remote server as the default path.

## Trust classes

Use these trust classes for tracked MCP examples and docs.

### `trusted-remote-read`

Use for hosted read-oriented docs or context servers.

Current servers:

- `openaiDeveloperDocs`
- `context7`

Default stance:

- allowed in `default-full`
- allowed in `safe-readonly`
- safe first step for operators who want docs augmentation without browser runtime or GitHub mutation surfaces

### `local-browser-runtime`

Use for local stdio browser/runtime tooling that should stay bounded to the
workspace runtime contract.

Current servers:

- `playwright`
- `chrome-devtools`

Default stance:

- allowed in `default-full`
- allowed in `browser-debug`
- should use workspace-owned wrappers so `WORKSPACE_ROOT` and the shared Playwright browser cache stay consistent

### `guarded-remote-write`

Use for remote servers that can read and mutate external systems.

Current server:

- `github`

Default stance:

- allowed in `default-full`
- allowed in `github-full`
- never pretend this is a low-risk profile
- keep secrets and auth local-only

## Profiles

The official workspace profiles are:

- `default-full`
- `safe-readonly`
- `browser-debug`
- `research`
- `github-full`

`default-full` is the convenience default on this machine.

It is not the safest default.

The documented downgrade path is:

- `safe-readonly`

Use `safe-readonly` when you want only the docs stack and do not want browser
runtime or GitHub mutation surfaces.

## Placement and local overlays

Keep the layered model from `06-cross-agent-skills-and-mcp.md`:

- tracked workspace templates in `tools/templates/mcp/`
- tracked repo-safe examples in `repos/<repo>/.workspace/mcp/`
- generated local overlays in `tools/local/agents/codex/`
- active Codex config in `~/.codex/config.toml` or `$CODEX_HOME/config.toml`

Rules:

- do not commit secrets, PATs, API keys, or machine-specific absolute paths
- do not commit the generated overlay
- do not let repo-local MCP examples become hidden runtime dependencies

## Review checklist

Before adding a new tracked MCP example or changing an official profile, answer:

- what data can the server read
- what writes can it perform
- does the workspace already have that capability natively
- which trust class applies
- which profile should own it
- which env vars or auth flows are required
- whether any wrapper needs `WORKSPACE_ROOT` or shared cache paths
- how to downgrade or disable it safely

If those answers are not clear, do not add the server to the official set.
