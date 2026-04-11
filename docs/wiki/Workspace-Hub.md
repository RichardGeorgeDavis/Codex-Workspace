# Workspace Hub

Workspace Hub is the most concrete product in Codex Workspace today.

Its role is to scan sibling repositories under `repos/`, classify them conservatively, expose runtime status, and provide practical start, stop, open, and preview actions.

## What It Should Do

- scan sibling repos under `repos/`
- read or infer repo metadata
- show runtime status
- allow start, stop, and open actions
- support both direct local previews and mapped-host or proxy-linked previews when configured

The goal is useful local control without forcing all repos into one runtime model.

## Design Preferences

Prefer:

- readable, modular structure
- clear status messages
- explicit process and runtime handling
- graceful failure states

Avoid:

- hidden behavior
- assuming all repos use the same package manager
- assuming proxy mode is always better
- hard-coding unstable machine-specific paths

## Read More

- [Workspace Hub README](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repos/workspace-hub/README.md)
- [Workspace Hub build spec](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/03-workspace-hub-build-spec.md)
- [Build order and Definition of Done](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/docs/04-build-order-and-dod.md)
- [Workspace Hub manifest docs](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repos/workspace-hub/docs/manifest.md)
- [Workspace Hub runtime troubleshooting](https://github.com/RichardGeorgeDavis/Codex-Workspace/blob/main/repos/workspace-hub/docs/runtime-troubleshooting.md)
