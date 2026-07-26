# GitHub Copilot Instructions

Root `AGENTS.md` is the canonical public agent contract for this workspace.
Follow these same defaults when working through Copilot, even when this file is
read on its own by a converter or third-party tool.

For this repository:

- keep standalone repos independently runnable
- share caches under `cache/`, not dependency installs across repos
- use `.workspace/project.json` when runtime behavior or preview mode should be explicit
- keep machine-specific notes, MCP config, secrets, and personal prompt files in ignored local locations such as `tools/local/`
- prefer direct local runtime for frontend and dev-server projects unless a repo manifest says otherwise
- treat WordPress repos already managed by Local or a mapped host as `external` by default
- when editing `repos/workspace-hub`, classify repos conservatively and do not assume one package manager or one runtime model
- avoid introducing mandatory orchestration layers, shared dependency trees, or hidden automation
- prefer small, readable changes with clear failure states
- treat `.agents/skills/` as the tracked TomeVault skill distribution mirror, not as the primary authoring source
