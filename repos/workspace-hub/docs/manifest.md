# Manifest Guide

Workspace Hub reads and writes repo manifests at:

```text
.workspace/project.json
```

Use a manifest when a repo needs explicit runtime metadata instead of relying only on conservative detection.

The repo intake action in Workspace Hub only writes a manifest when the selected repo appears to benefit from explicit runtime metadata. If the repo already looks clear from its files and inferred commands, intake leaves the manifest absent.

For local-only overrides, Workspace Hub also supports:

```text
.workspace/project.local.json
```

The local override file is intended for private machine-specific changes and should stay untracked.

## Required fields

These fields are required when Workspace Hub writes a manifest:

- `name`
- `slug`
- `type`
- `preferredMode`

Accepted `type` values:

- `node-app`
- `other`
- `php`
- `static`
- `threejs`
- `vite`
- `wordpress`

Accepted `preferredMode` values:

- `direct`
- `external`
- `servbay`

## Optional fields

Workspace Hub currently supports these optional fields:

- `packageManager`
- `installCommand`
- `devCommand`
- `buildCommand`
- `previewCommand`
- `previewUrl`
- `externalUrl`
- `healthcheckUrl`
- `servbayPath`
- `servbaySubdomain`
- `tags`
- `notes`

If a repo relies on an optional workspace ability or core service for part of its workflow, document that explicitly in `README.md` or `HANDOVER.md` instead of assuming the workspace has that capability installed. Keep the manifest focused on runtime behavior, not hidden workspace dependencies.

## Write behaviour

- Empty string fields are removed instead of being written as empty values.
- Empty `tags` arrays are omitted.
- Existing unknown manifest keys are preserved when Workspace Hub rewrites a manifest.
- If an existing manifest file is not valid JSON, Workspace Hub refuses to overwrite it.
- Workspace Hub writes `project.json`; it reads `project.local.json` as an optional local-only overlay.

## Field order

When Workspace Hub writes a manifest, it uses this order for known fields:

1. `name`
2. `slug`
3. `type`
4. `preferredMode`
5. `packageManager`
6. `installCommand`
7. `devCommand`
8. `buildCommand`
9. `previewCommand`
10. `previewUrl`
11. `externalUrl`
12. `healthcheckUrl`
13. `servbayPath`
14. `servbaySubdomain`
15. `tags`
16. `notes`

Unknown preserved keys are appended after the known keys.

## Example

```json
{
  "name": "Workspace Hub",
  "slug": "workspace-hub",
  "type": "node-app",
  "preferredMode": "direct",
  "packageManager": "pnpm",
  "installCommand": "pnpm install",
  "devCommand": "pnpm dev",
  "buildCommand": "pnpm build",
  "previewCommand": "pnpm preview",
  "previewUrl": "http://127.0.0.1:4100",
  "healthcheckUrl": "http://127.0.0.1:4101/api/health",
  "tags": ["hub", "workspace", "tooling"],
  "notes": "Local-first dashboard for managing mixed-stack repo workspaces."
}
```

## Local-only override example

```json
{
  "tags": ["internal", "workspace"],
  "notes": "Private operator notes for my machine."
}
```

## Practical guidance

- Prefer `direct` for Vite, Three.js, and similar frontend repos unless a repo explicitly needs something else.
- Prefer `external` for WordPress repos already managed by Local or another app.
- Use `servbayPath` or `servbaySubdomain` only when that routing is stable and tested.
- Keep manifests explicit and readable; do not turn them into a dump of every inferred value unless the repo benefits from that clarity.
- Keep local-only values in `project.local.json` when they should not ship with the repo.
- If the repo needs a workspace ability for operator workflows, mention the install command in repo docs instead of trying to encode that dependency implicitly in the manifest.
