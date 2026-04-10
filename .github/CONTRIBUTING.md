# Contributing

Thanks for contributing to Codex Workspace. The repo has one concrete app surface in `repos/workspace-hub/`, plus workspace-wide docs, scripts, templates, and metadata conventions around it.

## Ways To Help

- Docs clarity and repo entry flow.
- Reproducing and tightening focused bug reports.
- Small Workspace Hub UX and copy improvements.
- Repo classification heuristics and manifest examples.
- Workspace scripts, templates, and troubleshooting guidance.

Start with the public contribution map in [docs/13-contributor-roadmap.md](../docs/13-contributor-roadmap.md) if you want current help-wanted areas or ready-to-open starter issue briefs.

Use [docs/14-git-and-github-workflow.md](../docs/14-git-and-github-workflow.md) as the default issue, discussion, branch, and PR baseline when a repo does not already document a clearer local collaboration path.

## Small Contributions

- README and docs fixes.
- Issue reproduction or narrower acceptance criteria.
- Workspace Hub empty-state, copy, and small UI polish.
- Manifest examples and repo-classification edge cases.
- Script messaging and troubleshooting notes.

## Larger Changes

Open or comment on an issue before starting work in a GitHub-backed repo when the change is:

- broad structural changes
- major runtime-policy changes
- large UI shifts in Workspace Hub
- changes that affect workspace conventions across multiple surfaces

For local-only or git-only repos, record the same scope in tracked local docs such as `README.md`, `HANDOVER.md`, or `Next Batches` instead of forcing a GitHub issue queue.

## Lightweight PR Path

1. Comment on an issue or explain the focused problem in the PR.
2. Keep the change small enough to review without understanding the entire workspace.
3. Run the checks that match the touched area.
4. Explain verification simply in the PR description.

Typical verification:

- Docs-only changes: proofread the links and affected flow.
- Scripts or templates: run the relevant script in preview or non-destructive mode when possible.
- `workspace-hub` changes: run the narrowest useful combination of `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`.

## Local setup

Clone the repository:

```bash
git clone https://github.com/RichardGeorgeDavis/Codex-Workspace.git
cd Codex-Workspace
```

For documentation, metadata, or script-only changes, no additional setup is required beyond reading [README.md](../README.md) and [docs/README.md](../docs/README.md).

For `workspace-hub` changes:

```bash
cd repos/workspace-hub
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## Guardrails

- Keep unrelated repositories independent.
- Share caches, not installs.
- Do not make ServBay mandatory.
- Put canonical workspace docs in `docs/`.
- Keep repo-local docs with the repo they describe.
- Avoid unrelated cleanup in the same PR.

## Questions

- Review [README.md](../README.md)
- Review [docs/13-contributor-roadmap.md](../docs/13-contributor-roadmap.md)
- Review [docs/14-git-and-github-workflow.md](../docs/14-git-and-github-workflow.md)
- Start with [docs/README.md](../docs/README.md)
- Use [GitHub Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a) for setup or usage questions
- Open an issue if the intended change affects workspace conventions

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
