# Repo Docs Template

Use this template set when a repo is added under `repos/` and it needs a minimal onboarding pass.

This folder gives you:

- `README.template.md` for a lightweight repo README
- `cover-placeholder.png` for a repo-local starter cover image

## Recommended usage

1. Copy `README.template.md` into the target repo as `README.md` if the repo does not already have one.
2. Copy `cover-placeholder.png` into the target repo as `docs/cover.png`.
3. Replace the placeholders in the README with repo-specific setup, run, and preview details.
4. Keep the marked cover block so Workspace Hub can replace the placeholder later.

## Cover block

```md
<!-- workspace-hub:cover:start -->
![Repo cover](docs/cover.png)
<!-- workspace-hub:cover:end -->
```

Keep the initial path as a PNG inside the repo so later screenshot capture can overwrite it cleanly.
