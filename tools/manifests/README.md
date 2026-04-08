# Manifests

Store lightweight inputs for shared scripts here.

- `repos.example.txt` shows the format expected by `tools/scripts/clone-all.sh`.
- `repo-groups.json` is the default targeted update manifest used by `tools/scripts/update-all.sh --group ...`.
- `repo-groups.example.json` remains a sample shape for adapting the group format.
- `workspace-capabilities.json` is the canonical registry for reviewed external sources, installable abilities, and core workspace services.
- `reference-sources.json` lists ignored upstream reference snapshots that can be refreshed into `tools/ref/` with `tools/scripts/sync-reference-snapshots.sh`.
- `github-repos.json` is a legacy compatibility record for older update-only GitHub-ref flows. New installable abilities and core services should be tracked in `workspace-capabilities.json`.
- `core-services.json` lists workspace-level services that live outside `repos/` because they become part of how the workspace itself operates.

Current reviewed examples include:

- `openai/skills` for selective upstream skill sourcing
- `openai/codex` for official Codex CLI and `.codex/` surface review
- `oh-my-codex` for optional local Codex workflow ideas
- `oh-my-openagent` for OpenCode-specific reference patterns
- `MemPalace` as a core workspace service under `tools/`
- `VoltAgent/awesome-design-md` as an optional ability under `repos/abilities/` plus a local `DESIGN.md` catalog mirror under `cache/design-md/`
