# Repo Manifests

Codex Workspace prefers lightweight metadata where explicit runtime behavior helps.

The usual place for per-repo metadata is:

- `.workspace/project.json`

## Why Manifests Exist

Manifests help make repo behavior explicit when detection alone is not enough.

Typical uses:

- declare the preferred runtime mode
- clarify preview behavior
- document entrypoints or launch commands
- override conservative file-based classification when needed

## General Guidance

- keep each repo independently runnable
- do not create shared dependency installs across unrelated repos
- prefer direct local runtime for frontend-style projects
- keep WordPress handling pragmatic and external where that is already working well
- use explicit metadata only where it adds clarity

## Read More

- [Examples and templates](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/05-examples-and-templates.md)
- [Project manifest template](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/project-manifest.template.json)
- [Repo index sample](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repo-index.sample.json)
- [Workspace Hub manifest docs](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repos/workspace-hub/docs/manifest.md)
