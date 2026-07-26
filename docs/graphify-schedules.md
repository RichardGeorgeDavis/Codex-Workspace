# Graphify schedules

Graphify refresh remains manual during the pilot. Do not add cron, launchd,
Loop Engineering integration, or a background watcher.

| Review | Cadence | Action | Durable record |
| --- | --- | --- | --- |
| Tool health | Weekly while active | Run `tools/scripts/graphify-check.sh` | None unless status changes |
| Workspace Hub refresh | Weekly while active | Dry run, then explicit `--run` | Adoption register refresh date |
| Structural event | After route, runtime, search, auth, schema, or major module changes | Rebuild and sample affected paths | Codebase map if architecture changed |
| Release or handover | Before milestone close | Rebuild, review report, update human summary | Handover and pilot results |
| Privacy audit | Monthly | Recheck allowlist and scan output for excluded paths | Pilot results |
| Version review | Monthly | Compare upstream with pinned `0.9.11`; do not auto-upgrade | Changelog only when changed |
| Local-output cleanup | Quarterly | Remove stale ignored `graphify-out/` directories intentionally | None |

Do not refresh for copy-only edits, lockfile-only changes, generated output,
media changes, archives, or inactive repositories.
