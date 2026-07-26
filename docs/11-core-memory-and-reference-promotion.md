# 11-core-memory-and-reference-promotion

## Purpose

This note defines the workspace source taxonomy and how Codex Workspace should
adopt reviewed GitHub references without treating every upstream the same way.

The previous workspace memory service has been removed. The workspace now keeps
memory-related tools as reference material only unless a future decision
promotes a reviewed replacement.

## Source taxonomy

Use one of four classifications:

1. `reference-only`
   - keep it under `tools/ref/`
   - use it for review, comparison, extraction, or selective copying

2. `ability`
   - keep the managed optional repo under `repos/abilities/<slug>/`
   - treat it as installable and removable workspace help, not a default runtime dependency

3. `repo-level adoption`
   - keep it under normal `repos/...`
   - let the repo stay independently runnable

4. `core service`
   - keep the runtime code under `tools/<name>/`
   - keep durable per-user state under `shared/<name>/<user>/`
   - keep disposable artifacts under `cache/<name>/<user>/`

Tracked installable abilities and core services belong in:

- `tools/manifests/workspace-capabilities.json`
- `tools/scripts/manage-workspace-capabilities.sh`

No memory core service is currently installed or enabled by default.

## Workspace memory stance

Codex Workspace does not currently provide a shared workspace memory runtime.

Use this stance:

- record durable repo closeout in tracked repo docs such as `README.md`,
  `HANDOVER.md`, `DESIGN.md`, or relevant docs under `docs/`
- record workspace closeout in `docs/HANDOVER.md` and `docs/CHANGELOG.md`
- use generated side-load summaries under `cache/context/` only as optional
  local context
- do not add hook activation, background ingest, transcript storage, database
  services, or credentialed memory tooling without a separate review

## OpenAI Agents SDK sandbox decision

OpenAI's Agents SDK sandbox support is currently a reference and repo-level
adoption candidate for this workspace, not a workspace `ability`.

The April 15, 2026 OpenAI announcement describes a stronger Agents SDK harness
and native sandbox execution, and the current OpenAI docs describe sandbox
agents for Python and TypeScript. The same docs still mark Sandbox Agents as
beta, so the workspace should not add a shared install, `repos/abilities/...`
checkout, or capability-manifest entry until a specific repo needs an Agents
SDK sandbox runner.

Use this stance:

- keep the SDK as reviewed source material unless a concrete repo needs it
- adopt the SDK inside that repo when needed, with repo-owned dependencies,
  sandbox provider choice, secrets boundary, and tests
- add a `tools/ref/...` snapshot entry later only if local reviewed source
  snapshots of `openai-agents-python` or `openai-agents-js` become useful

Sources:

- [OpenAI announcement](https://openai.com/index/the-next-evolution-of-the-agents-sdk/)
- [OpenAI Sandbox Agents docs](https://developers.openai.com/api/docs/guides/agents/sandboxes)
- [OpenAI SDKs and CLI docs](https://developers.openai.com/api/docs/libraries#use-the-agents-sdk)

## Promotion requirements

Before any memory runtime becomes a workspace core service, document:

- which harnesses are enabled
- which data is stored, truncated, redacted, and retained
- where credentials live and how they are loaded
- failure behavior when the backing service is unavailable
- install, uninstall, and data-removal behavior
- Workspace Hub API/UI exposure
- verification coverage

Until that review exists, memory-related sources remain reference-only.
