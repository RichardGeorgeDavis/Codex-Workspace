# Local Overrides

Use local override files when you want to keep operator-specific notes and machine-specific settings out of the public repo.

## Workspace root reminder

Workspace root means the `Codex Workspace/` folder itself, not one fixed absolute path on a specific machine.

That root folder should contain:

- `repos/`
- `cache/`
- `shared/`

`repos/` should stay present on disk as the container for child repos, but it should stay ignored by the top-level workspace repo.

## Recommended pattern

- keep portable, public-safe defaults in `.workspace/project.json`
- keep local-only manifest changes in `.workspace/project.local.json`
- keep personal notes in ignored `docs/*.local.md` files

## Good local-only content

- internal notes or tags
- machine-specific preview URLs
- temporary command overrides
- operator checklists that do not belong in public docs

## Public vs local examples

Public default:

```json
{
  "name": "Workspace Hub",
  "slug": "workspace-hub",
  "type": "node-app",
  "preferredMode": "direct",
  "packageManager": "pnpm",
  "devCommand": "pnpm dev"
}
```

Local-only override:

```json
{
  "tags": ["internal", "workspace"],
  "notes": "Private operator notes for my local setup."
}
```

## Notes

- Workspace Hub reads `.workspace/project.local.json` when it exists.
- The public manifest remains the source of truth for repo-native defaults.
- Local-only files should stay ignored and untracked.
