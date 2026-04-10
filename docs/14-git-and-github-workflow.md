# 14-git-and-github-workflow

## Purpose

This note defines the default collaboration workflow for repositories inside Codex Workspace.

If a repo has clearer local guidance in `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, or `HANDOVER.md`, follow that repo-local guidance first.

This is an advisory baseline, not a requirement to give every repo the same GitHub setup.

## Baseline rule

Use the lightest collaboration surface that still keeps the work understandable and resumable.

- Local docs are the default fallback for repos that are local-only or do not need a public collaboration queue.
- GitHub Issues and Pull Requests are the default path for non-trivial work in repos that actually use GitHub.
- GitHub Discussions are useful for questions and open-ended discussion when that repo has Discussions enabled.
- `gh` is recommended convenience tooling, not a workspace requirement.
- `gh auth login` is optional maintainer setup, not part of the clean-clone baseline.

## Repo states

### Local-only

Use this when a repo is not meant to be shared through GitHub or when the work is still purely local.

- Track meaningful work in `README.md`, `HANDOVER.md`, or a `Next Batches` section.
- Use a local branch when the change is risky, long-running, or easier to review as a separate slice.
- Do not force issues or PRs where a tracked local handover is enough.

### Git-only

Use this when the repo is under Git but has no GitHub remote that matters for the current work.

- Keep the same local tracking path as `local-only`: `README.md`, `HANDOVER.md`, or `Next Batches`.
- Prefer small focused branches for non-trivial work.
- Treat Git history as the reviewable surface unless the repo later adopts a GitHub queue.

### GitHub-backed

Use this when the repo has a GitHub remote and real collaboration happens there.

- Use GitHub Discussions for setup questions, usage questions, policy questions, and open-ended design discussion when that repo has Discussions enabled.
- If Discussions is not enabled, use Issues for actionable work and keep broader local context in tracked docs until the repo defines a better question flow.
- Use GitHub Issues for actionable bugs, focused enhancements, docs work, and tracked follow-up tasks.
- Use Pull Requests for non-trivial code, docs, or workflow changes that should be reviewed as a unit.
- A tiny obvious change can still go straight to a focused PR, but non-trivial work should usually have an issue or clear written problem statement first.

### Fork and upstream

Use this when the repo has both a writable fork and a separate upstream remote.

- Keep your working branch on the writable remote.
- Reference upstream issues when the work is really for upstream rather than only for the fork.
- Open the PR against the repo that should actually receive the change.
- Only use closing keywords when the PR targets the same repo that owns the issue. Otherwise use a non-closing reference such as `Refs #123`.

## Default flow for non-trivial work

1. Check whether repo-local docs override this workspace baseline.
2. Choose the tracking surface:
   - local docs for local-only or git-only work
   - Discussions for open-ended questions or policy discussion when the repo has Discussions enabled
   - Issues for scoped actionable work
3. Create a focused branch when the work is more than a tiny direct fix.
4. Make the change, run the narrowest useful verification, and record what was checked.
5. Close out on the matching surface:
   - update `README.md`, `HANDOVER.md`, or `Next Batches` for local-only or git-only repos
   - open or update a PR for GitHub-backed repos

## Branch guidance

These names are guidance, not enforcement.

- Prefer short descriptive prefixes such as `docs/`, `fix/`, `feat/`, or `chore/`.
- If there is an issue number, include it when helpful, for example `fix/123-preview-routing`.
- Keep one branch focused on one reviewable outcome.

## Issue, PR, and closeout guidance

- Link the issue, discussion, or brief problem statement in the PR description.
- Use closing keywords such as `Closes #123` only when merging that PR should close the issue in the same target repo.
- Use non-closing references such as `Refs #123` when the issue lives in another repo, when the PR targets a fork first, or when more work remains.
- Close the issue when the accepted change actually lands, not when a branch merely exists.
- For local-only or git-only repos, record equivalent closeout context in tracked docs instead of inventing a fake issue queue.
- In Codex Workspace, a request to update a tracked handover should also trigger the matching `workspace-memory` closeout after the docs update:
  repo-specific handover updates should run `tools/bin/workspace-memory save-repo <repo-name>`, and workspace-level handover updates should run `tools/bin/workspace-memory save-workspace`.
- If both repo and workspace handover surfaces changed in one slice, run those MemPalace closeout commands serially so they do not contend on the same local store.
- Before closing the chat, run a quick `git status` sanity check and confirm any changed public doc surfaces still agree, especially `README.md`, `docs/README.md`, `docs/CHANGELOG.md`, and the relevant repo-local README.

## What this baseline does not require

- GitHub Projects
- a uniform label set across every repo
- repository rulesets beyond what an individual repo wants
- a PR-only workflow for local-only repos
- `gh auth login` on every machine

## Common workspace scenarios

### Codex Workspace root repo

- Use the root issue templates, contributor guide, and PR template.
- Route setup and usage questions toward Discussions Q&A.
- Use issues and PRs for non-trivial workspace docs, tooling, and `workspace-hub` changes.

### Normal GitHub-backed sibling repo

- Use the repo's own docs first.
- If it has no clearer collaboration doc, use this baseline: issue for scoped work, branch for implementation, PR for reviewable change, and Discussions only when that repo has them enabled.

### Fork with upstream

- Keep the fork writable and upstream clean.
- Track upstream-facing work against the upstream issue when relevant.
- Avoid accidental upstream auto-close language from fork-only PRs.

### Local-only git repo

- Keep the queue in tracked local docs.
- Use branches and commits as the review surface.
- Promote the repo to a GitHub-backed workflow only when that actually helps collaboration.
