# GitHub Rulesets

These JSON files are intended for GitHub's repository ruleset import flow.

Recommended starting set for this repo:

- `protect-main.json`
- `protect-release-tags.json`

They are intentionally minimal:

- protect `main` from accidental deletion or non-linear history
- protect `v*` release tags from being moved or deleted
- do not force a PR-only workflow or required checks yet

Import them from the repository Rulesets UI.

Suggested rollout:

1. import the branch ruleset for `main`
2. if your UI supports it, start in `evaluate`
3. switch to `active` after confirming it matches your workflow
4. import the tag ruleset for `v*` once your release process is stable
