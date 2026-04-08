# {{PROJECT_NAME}}

<!-- workspace-hub:cover:start -->
![{{PROJECT_NAME}} cover](docs/cover.png)
<!-- workspace-hub:cover:end -->

Local reference copy of a publicly accessible site or experience.

## Source

- Public URL: `{{SOURCE_URL}}`
- Capture date: `{{CAPTURE_DATE}}`
- Request type: `site clone` / `site rip` / `reference copy`
- Current classification: `{{CLASSIFICATION}}`

## Position

- This repo is not the original source project unless original source files were separately provided.
- Treat it as a public frontend capture for inspection, local playback testing, or rebuild research.
- Keep the distinction clear between a deployed mirror, a working local reference copy, and a rebuild.

## Status

- Runtime mode: `direct`
- Local preview: `{{PREVIEW_URL}}`
- Entry path: `{{ENTRY_PATH}}`
- Works fully offline: `unknown`

## Acquisition

1. Fetch method: `{{FETCH_METHOD}}`
2. Local serve command: `{{SERVE_COMMAND}}`
3. If automatic download fails for specific files, give the direct URLs to the user and place the manually downloaded copies in `ref/`
4. Extra notes:

## What Is Included

- Public HTML, CSS, JS bundles, and static assets that were retrievable at capture time
- Enough local structure to inspect or test the captured frontend

## What Is Not Included

- Original source files such as `.tsx`, `.jsx`, or authoring-time modules unless supplied separately
- Original build tooling and repository history
- Server-side code, private APIs, secrets, and environment variables

## Inspection Checklist

- Review `index.html` and asset paths
- Serve via a local HTTP server rather than `file://`
- Check browser DevTools for missing chunks, remote APIs, external assets, and console errors
- If specific assets are blocked during automated capture, list their direct URLs and map any user-downloaded copies under `ref/`
- Record unresolved issues and remote dependencies in `HANDOVER.md` if work continues

## Next Path

- Keep as a reference snapshot if the mirror is good enough
- Tighten into a working local reference copy if a little repair is needed
- Create a separate rebuild repo if maintainable editing or ownership is the real goal

## Next Batches

- Batch 1:
- Batch 2:
