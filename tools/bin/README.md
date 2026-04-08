# Bin

Place small workspace wrappers here when a shared command is useful across repositories.

Current wrappers include:

- `workspace-memory` for the MemPalace workspace service
- `mempalace-start` for the MemPalace MCP runtime
- `mempalace-sync` for safe fast-forward updates of the MemPalace repo
- `workspace-memory mine-convos` for local conversation-export ingest
- `workspace-memory mine-codex` for Codex archived session ingest
- `workspace-memory export-codex` for readable Codex session exports under `shared/mempalace/<user>/exports/`
- `workspace-memory mine-codex-current` for active-thread capture from `~/.codex/sessions`
- `workspace-memory save-repo` and `workspace-memory save-workspace` for explicit closeout saves without the Hub UI

These wrappers are operator-facing workspace commands. When their behavior or placement changes, update the public docs in the same slice:

- `README.md`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `repos/workspace-hub/README.md` when the Hub surfaces the same command flow
