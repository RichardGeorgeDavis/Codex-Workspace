# Repo Docs Template

Use this template set when a repo is added under `repos/` and it needs a minimal onboarding pass.

This folder gives you:

- `README.template.md` for a lightweight repo README
- `README.site-reference.template.md` for public site mirror or reference-copy repos
- `cover-placeholder.png` for a repo-local starter cover image

## Recommended usage

1. Copy `README.template.md` into the target repo as `README.md` if the repo does not already have one.
2. For a public site clone, rip, or mirror request, start from `README.site-reference.template.md` instead of the generic README template.
3. Copy `cover-placeholder.png` into the target repo as `docs/cover.png`.
4. Replace the placeholders in the README with repo-specific setup, run, preview, and source-capture details.
5. Keep the marked cover block so Workspace Hub can replace the placeholder later.
6. If the repo has meaningful planned work, add a short `Next Batches` section so future chats can implement end-to-end slices without re-planning from scratch.

For site-reference repos, make the README explicit about the difference between:

- a deployed mirror
- a working local reference copy
- the original source project

If automated capture misses protected files, also record the direct asset URLs given to the user and keep any user-downloaded fallback copies in a repo-local `ref/` folder.

## Cover block

```md
<!-- workspace-hub:cover:start -->
![Repo cover](docs/cover.png)
<!-- workspace-hub:cover:end -->
```

Keep the initial path as a PNG inside the repo so later screenshot capture can overwrite it cleanly.

## Next Batches convention

For repo-specific larger work, prefer one of these tracked locations:

1. `openspec/changes/.../tasks.md`
2. `HANDOVER.md`
3. a short `Next Batches` section in `README.md`

Each batch should describe one complete slice, the expected files or surfaces, and the verification step.
