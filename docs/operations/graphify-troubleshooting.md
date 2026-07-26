# Graphify troubleshooting

## Command missing or wrong version

```bash
uv tool install --python 3.11 'graphifyy==0.9.11'
tools/scripts/graphify-check.sh
```

Do not silently upgrade during a pilot refresh.

## Repo wrapper refuses to run

The target must resolve below this workspace's `repos/` directory, contain a
reviewed `.graphifyignore`, and ignore `graphify-out/` in `.gitignore`. The
wrapper intentionally does not repair these conditions.

## Graph contains excluded or private content

Stop the pilot, remove local `graphify-out/`, tighten `.graphifyignore`, and
rebuild. Remember that `.graphifyignore` takes precedence over `.gitignore`.

## Query metadata appears in the user cache

Use the workspace wrapper, which exports `GRAPHIFY_QUERY_LOG_DISABLE=1`. Do not
enable full query-response logging during the pilot.

## Codex hook is noisy or fails

Restore the ignored setup backup, remove the Graphify section and hook entries,
and record the pilot as paused. Codex must remain usable without Graphify.

## Git hook needs to be skipped once

```bash
GRAPHIFY_SKIP_HOOK=1 git commit ...
```

The Git hook is machine-local at the workspace Git root because Workspace Hub is
tracked by the root repository. Keep it scoped to `repos/workspace-hub/` and the
guarded workspace wrapper; do not replace it with an unscoped upstream hook.

## Rollback

Keep `graphify-out/` ignored, restore reviewed files from
`cache/graphify/setup-backups/`, remove Graphify's local Git hook/config, and
update the adoption register, pilot results, handover, and changelog.
