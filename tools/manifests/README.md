# Manifests

Store lightweight inputs for shared scripts here.

- `repos.example.txt` shows the format expected by `tools/scripts/clone-all.sh`.
- `repo-groups.example.json` shows the format expected by `tools/scripts/update-all.sh --group ...` for targeted repo-group updates.
- `reference-sources.json` lists ignored upstream reference snapshots that can be refreshed into `tools/ref/` with `tools/scripts/sync-reference-snapshots.sh`.

Current reviewed examples include:

- `openai/skills` for selective upstream skill sourcing
- `openai/codex` for official Codex CLI and `.codex/` surface review
- `oh-my-codex` for optional local Codex workflow ideas
- `oh-my-openagent` for OpenCode-specific reference patterns
