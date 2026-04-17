# New Repo Baseline

Use this document as the default baseline for any repository added under `repos/` in the Codex Workspace.

This is not meant to force every repo into one shape. The goal is to keep each repo independently runnable while making workspace behaviour predictable.

## What every new repo should preserve

- Keep the repo independently runnable on its own terms.
- Do not merge unrelated repos into one shared dependency install.
- Use shared caches under workspace `cache/` where that helps, but keep installs local to the repo.
- Do not make a reverse-proxy or mapped-host layer mandatory unless the repo genuinely needs that behaviour.
- Prefer the repo's native runtime and package manager.
- For workspace launchers, keep the host stable on `127.0.0.1` and prefer a repo-specific port range that can step to the next open port instead of randomizing addresses.

## Default runtime expectations

### Static, Vite, Three.js, WebGL, and similar frontend repos

- Default to `direct` runtime.
- Prefer running on the repo's own local port.
- Do not force these repos behind a proxy or mapped host by default.

### WordPress repos

- Default to `external` runtime.
- Keep existing Local-managed projects on Local unless there is a clear reason to move them.
- Use mapped-host or proxy preview only when it adds practical value and does not become a hidden requirement.

### Other server-side repos

- Use repo-native runtime first.
- Add proxy or mapped-host support only when it solves a real local workflow problem.

## Recommended files for new repos

When useful, add small explicit metadata instead of hidden assumptions:

- `.workspace/project.json` for runtime mode, launch command, preview URL, or notes
- `.workspace/agent-stack.json` when the repo intentionally supports tracked multi-tool agent hints such as OMX-ready or OpenCode-ready setup
- `README.md` for repo purpose, setup, run instructions, preview notes, and cover block
- `docs/cover.png` as the default repo-local cover path, even if it starts as a placeholder
- a runnable launcher command file, preferably `local/commands/run-<repo>` inside the repo or `tools/local/commands/Run <repo>.command` in the workspace
- `HANDOVER.md` when the repo needs a resumable state document
- repo-level `AGENTS.md` only when the repo genuinely needs rules beyond the workspace baseline
- `.codex/skills/` and optional `.codex/config.toml` when the repo should expose official Codex repo-local surfaces
- `.agents/skills/` only when the repo also wants a tracked compatibility mirror for workspace-native agent tooling
- a repo-local `Next Batches` section in `README.md`, `HANDOVER.md`, or tracked `openspec/changes/.../tasks.md` when the work is large enough to need end-to-end implementation batches

## Default collaboration workflow

If a repo does not already define a clearer collaboration path in `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, or `HANDOVER.md`, use the workspace baseline in `docs/14-git-and-github-workflow.md`.

For repo intake, keep only the repo-specific implications here:

- identify whether the repo is local-only, git-only, GitHub-backed, or a fork-plus-upstream case
- prefer recording any repo-specific issue, PR, or discussion path in repo-local docs instead of restating the workspace baseline
- do not make GitHub Projects, a uniform label taxonomy, or `gh auth login` mandatory just because a repo lives inside this workspace

For public site reference copies, also prefer a short acquisition note in `README.md` or `HANDOVER.md` that records:

- source URL
- capture date
- fetch method
- whether the repo is a deployed mirror, a working local reference copy, or a rebuild

## Repo intake when a folder first appears under `repos/`

If a new repo arrives under `repos/` and it already contains setup notes or instruction files, treat those files as the first source of truth.

Recommended intake order:

1. Review the current repo content before adding workspace metadata.
2. Read existing setup sources such as `README.md`, `package.json`, `composer.json`, lockfiles, shell scripts, Local notes, or repo-local instruction files.
3. Classify the repo conservatively and choose a runtime mode only after checking the files.
4. Create `README.md` if it is missing, or tighten the current one if it exists but does not explain setup and preview.
5. Add a runnable launcher command file so the repo can be started without remembering the shell incantation.
6. Add a repo-local cover image reference in the README, even if the image is a placeholder at first.
7. Add `.workspace/project.json` only when runtime behavior is not obvious from the repo files.
8. Add repo-level `AGENTS.md`, `HANDOVER.md`, or repo-local skills only when they solve a real repo-specific need.
9. If README, HANDOVER, or durable setup docs were created or materially updated, run `tools/bin/workspace-memory save-repo <repo-path-or-name>` so the shared memory layer captures the repo state, related workspace docs, and the current Codex thread in one closeout step.

For MemPalace target metadata, prefer `.workspace/mempalace/` inside the repo rather than dropping `mempalace.yaml` or `entities.json` at the repo root.

For the initial README cover block, prefer a PNG path that Workspace Hub can later replace with a live screenshot:

```md
<!-- workspace-hub:cover:start -->
![Repo cover](docs/cover.png)
<!-- workspace-hub:cover:end -->
```

Use a placeholder image first if a real preview capture is not ready yet. Keeping the path as `docs/cover.png` makes later cover capture simpler and consistent with the Hub defaults.

The starter files in `tools/templates/repo-docs/` are the default template source for this intake step.

## Implementation batches

Use batches when a repo has enough pending work that a future chat should be able to pick up one complete slice at a time.

Preferred placement:

1. workspace-wide batches live in `docs/HANDOVER.md`
2. repo-specific larger work lives in tracked `openspec/changes/.../tasks.md`
3. if a repo does not use `openspec/`, keep a short `Next Batches` section in `README.md` or `HANDOVER.md`

Each batch should be end-to-end and include:

- the user-facing outcome
- the files or surfaces likely to change
- the verification command or acceptance check
- any dependency on another batch landing first

## Special intake for site clone or rip requests

When a user asks for a site "clone" or "rip" and a new repo is added under `repos/`, default to a cautious reference-copy workflow.

Treat the request as one of these three outcomes:

1. a deployed mirror
2. a working local reference copy
3. a clean rebuild

Do not present a public-site mirror as if it were the original source project.

### Naming and classification

- Prefer neutral repo names such as `site-name-reference`, `site-name-mirror`, or `site-name-rebuild`.
- Avoid naming a mirrored repo as though it were the official upstream source.
- Default mirrored frontend copies to `direct` runtime.
- Use `.workspace/project.json` when the repo needs an explicit note that it is a reference snapshot rather than a normal source repo.

### Intake process

1. Record the public source URL and the capture date in `README.md` or `HANDOVER.md`.
2. State the acquisition method clearly, such as `wget`, `httrack`, or manual asset capture.
   If `httrack` is available, prefer the workspace wrapper `tools/scripts/capture-site-reference.sh --run <url> <target-dir>` so the repo gets a consistent capture note under `ref/httrack/`.
3. Document what the repo is: deployed mirror, working local reference copy, or rebuild.
4. Document what is not present: original source files, build tooling, history, server-side code, private APIs, and environment variables unless they were actually supplied.
5. Serve the repo through a lightweight local server for testing; do not treat `file://` opening as the default verification path.
6. Inspect and note remaining remote dependencies such as absolute asset URLs, remote APIs, dynamic chunks, fonts, models, or config files.
7. If some files cannot be fetched automatically because of permissions, hotlink protections, expiring URLs, or other blockers, give the direct URLs to the user in chat so they can download them manually.
8. Place those manually supplied files in a repo-local `ref/` folder and document their original URLs and intended paths in `README.md` or `HANDOVER.md`.
9. If long-term editing or ownership is the real goal, create a separate rebuild repo instead of mutating the raw mirror into a pseudo-source project.

### Recommended repo shape for a public-site reference copy

- `README.md` should explain source, status, local run path, and limitations.
- `HANDOVER.md` should track inspection findings, unresolved remote dependencies, and rebuild recommendations when the work will continue.
- `ref/` can hold manually downloaded fallback assets that could not be fetched automatically.
- `docs/cover.png` should still be used for the Workspace Hub cover block.
- Keep the mirrored output independently runnable on its own terms; do not immediately wrap it in unrelated workspace tooling.

### Example use case

For a request such as a local copy of `https://particles.casberry.in/`, the baseline stance should be:

- first create a reference repo for the public frontend capture
- serve it locally and test what still works
- document remote dependencies and missing source-level context
- create a separate rebuild repo only if maintainable editing is required

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
- If a repo depends on an optional workspace ability, document that dependency explicitly instead of assuming the ability is installed.
- If a new GitHub source has not yet been classified, do not place it under `repos/` by default. Start with the intake process in `docs/11-core-memory-and-reference-promotion.md`.

## Minimal onboarding expectation

For a repo to feel workspace-ready, it should ideally have:

1. a clear way to run or preview it, ideally via a tracked launcher command file
2. a known runtime mode: `direct`, `external`, or explicit repo-native server mode
3. a `README.md` that captures setup, run, and preview expectations
4. a repo-local cover image path in the README, even if it begins as a placeholder
5. a Codex-friendly closeout path such as `tools/bin/workspace-memory save-repo <repo-path-or-name>`
6. enough docs that another person can resume work without guessing

For GitHub-backed repos, that usually means enough repo-local docs to explain setup plus a readable issue and PR path. For local-only or git-only repos, it means the tracked local docs carry the same resumable context without pretending GitHub is required.

## Override rule

If a repo has its own `AGENTS.md` or clearer local docs, those should refine this baseline rather than duplicate it.
