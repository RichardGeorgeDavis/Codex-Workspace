# New Repo Baseline

Use this document as the default baseline for any repository added under `repos/` in the Codex Workspace.

This is not meant to force every repo into one shape. The goal is to keep each repo independently runnable while making workspace behaviour predictable.

## What every new repo should preserve

- Keep the repo independently runnable on its own terms.
- Do not merge unrelated repos into one shared dependency install.
- Use shared caches under workspace `cache/` where that helps, but keep installs local to the repo.
- Do not make ServBay mandatory unless the repo genuinely needs proxy or mapped-host behaviour.
- Prefer the repo's native runtime and package manager.

## Default runtime expectations

### Static, Vite, Three.js, WebGL, and similar frontend repos

- Default to `direct` runtime.
- Prefer running on the repo's own local port.
- Do not force these repos behind ServBay by default.

### WordPress repos

- Default to `external` runtime.
- Keep existing Local-managed projects on Local unless there is a clear reason to move them.
- Use ServBay only when it adds practical value and does not become a hidden requirement.

### Other server-side repos

- Use repo-native runtime first.
- Add proxy or mapped-host support only when it solves a real local workflow problem.

## Recommended files for new repos

When useful, add small explicit metadata instead of hidden assumptions:

- `.workspace/project.json` for runtime mode, launch command, preview URL, or notes
- `.workspace/agent-stack.json` when the repo intentionally supports tracked multi-tool agent hints such as OMX-ready or OpenCode-ready setup
- `README.md` for repo purpose, setup, run instructions, preview notes, and cover block
- `docs/cover.png` as the default repo-local cover path, even if it starts as a placeholder
- `HANDOVER.md` when the repo needs a resumable state document
- repo-level `AGENTS.md` only when the repo genuinely needs rules beyond the workspace baseline
- `.codex/skills/` and optional `.codex/config.toml` when the repo should expose official Codex repo-local surfaces
- `.agents/skills/` only when the repo also wants a tracked compatibility mirror for workspace-native agent tooling

## Repo intake when a folder first appears under `repos/`

If a new repo arrives under `repos/` and it already contains setup notes or instruction files, treat those files as the first source of truth.

Recommended intake order:

1. Review the current repo content before adding workspace metadata.
2. Read existing setup sources such as `README.md`, `package.json`, `composer.json`, lockfiles, shell scripts, Local notes, or repo-local instruction files.
3. Classify the repo conservatively and choose a runtime mode only after checking the files.
4. Create `README.md` if it is missing, or tighten the current one if it exists but does not explain setup and preview.
5. Add a repo-local cover image reference in the README, even if the image is a placeholder at first.
6. Add `.workspace/project.json` only when runtime behavior is not obvious from the repo files.
7. Add repo-level `AGENTS.md`, `HANDOVER.md`, or repo-local skills only when they solve a real repo-specific need.

For the initial README cover block, prefer a PNG path that Workspace Hub can later replace with a live screenshot:

```md
<!-- workspace-hub:cover:start -->
![Repo cover](docs/cover.png)
<!-- workspace-hub:cover:end -->
```

Use a placeholder image first if a real preview capture is not ready yet. Keeping the path as `docs/cover.png` makes later cover capture simpler and consistent with the Hub defaults.

The starter files in `tools/templates/repo-docs/` are the default template source for this intake step.

## `.workspace/project.json` guidance

Add `.workspace/project.json` when runtime behaviour is not obvious from the repo files alone.

Typical reasons:

- the repo can run in more than one mode
- the startup command is non-obvious
- the preview URL is not inferable
- the repo should be treated as `external`

Keep the manifest lightweight. It should clarify runtime behaviour, not become a second config system.

## Safe defaults for setup work

- Classify conservatively when repo type is unclear.
- Do not auto-run heavy install steps without a clear reason.
- Do not assume one package manager across all repos.
- Do not hard-code machine-specific paths inside repos when a relative or inferred path will do.
- Treat `tools/ref/` as temporary reviewed source material for extracting durable workspace upgrades, not as a dependency layer.

## Minimal onboarding expectation

For a repo to feel workspace-ready, it should ideally have:

1. a clear way to run or preview it
2. a known runtime mode: `direct`, `external`, or explicit repo-native server mode
3. a `README.md` that captures setup, run, and preview expectations
4. a repo-local cover image path in the README, even if it begins as a placeholder
5. enough docs that another person can resume work without guessing

## Override rule

If a repo has its own `AGENTS.md` or clearer local docs, those should refine this baseline rather than duplicate it.
