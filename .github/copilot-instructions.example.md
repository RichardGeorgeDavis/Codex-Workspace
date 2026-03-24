# Example GitHub Copilot Instructions

Use this file as a starting point when a repo wants short tracked Copilot guidance without duplicating its entire `AGENTS.md`.

Suggested shape:

- point Copilot to the canonical `AGENTS.md` or equivalent repo contract first
- state the workspace model in one or two lines
- call out the most important runtime defaults
- identify the right local-only location for secrets, MCP config, and personal notes
- list the two or three failure modes Copilot should avoid introducing

Example bullets:

- keep repos independently runnable
- prefer repo-native runtimes and shared caches rather than shared installs
- use tracked manifests for durable runtime metadata
- keep private or machine-specific Copilot additions outside Git
- avoid mandatory orchestration or tool-specific lock-in unless the repo explicitly wants it
