# Workspace Capabilities State

This folder holds local durable state for optional workspace capabilities.

- `state.json` is intentionally untracked
- the tracked source of truth for capability definitions is `tools/manifests/workspace-capabilities.json`
- enable or disable changes should update `state.json`, not the manifest
