# Bin

Place small workspace wrappers here when a shared command is useful across repositories.

Current wrappers include:

- `workspace-memory` for the MemPalace workspace service, currently disabled while write-lock and corpus-size behavior is reviewed
- `mempalace-start` for the MemPalace MCP runtime
- `mempalace-sync` for safe fast-forward updates of the MemPalace repo

While disabled, all `workspace-memory` subcommands fail fast before running
MemPalace closeout, ingest, search, wake-up, export, or graph work. Use tracked
docs and optional generated context-cache summaries for closeout context until
the pause is explicitly lifted.

These wrappers are operator-facing workspace commands. When their behavior or placement changes, update the public docs in the same slice:

- `README.md`
- `docs/README.md`
- `docs/CHANGELOG.md`
- `repos/workspace-hub/README.md` when the Hub surfaces the same command flow
