# Contributing

Thanks for contributing to Codex Workspace.

This repository is primarily for:

- workspace-level documentation
- workspace structure, templates, and scripts
- the vendored `repos/workspace-hub/` application

Open an issue before starting broad structural changes, major runtime-policy changes, or large UI shifts in Workspace Hub.

## Core rules

- Keep unrelated repositories independent.
- Share caches, not installs.
- Do not make ServBay mandatory.
- Put canonical workspace docs in `docs/`.
- Keep repo-local docs with the repo they describe.

## Local setup

Clone the repository and review the main docs:

```bash
git clone https://github.com/RichardGeorgeDavis/Codex-Workspace.git
cd Codex-Workspace
```

For documentation, metadata, or script-only changes, no additional setup is required.

For `workspace-hub` changes:

```bash
cd repos/workspace-hub
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## Pull requests

Please keep pull requests focused.

- Explain the problem and the change clearly.
- Update docs when behaviour or conventions change.
- Include verification steps for `workspace-hub` changes.
- Avoid unrelated cleanup in the same PR.

## Scope guidance

Good contribution targets:

- README and docs improvements
- workspace templates and scripts
- metadata conventions
- Workspace Hub UX, runtime handling, and repo classification

Avoid in this repo:

- adding unrelated project code under the workspace root
- introducing shared dependency installs across independent repos
- hard-coding one runtime model for every stack

## Questions

- Review [README.md](../README.md)
- Start with [docs/README.md](../docs/README.md)
- Open an issue if the intended change affects workspace conventions

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
