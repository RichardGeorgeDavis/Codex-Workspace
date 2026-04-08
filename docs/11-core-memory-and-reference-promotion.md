# 11-core-memory-and-reference-promotion

## Purpose

This note defines the workspace source taxonomy and how Codex Workspace should adopt a GitHub reference without treating every upstream the same way.

It also records the current decision to integrate MemPalace in that role.

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

Tracked installable abilities and core services now belong in:

- `tools/manifests/workspace-capabilities.json`
- `tools/scripts/manage-workspace-capabilities.sh`

## Decision

MemPalace should be treated as core workspace infrastructure for long-term memory and retrieval.

That means:

- do not treat it as a normal sibling project under `repos/`
- do not keep the live integration only as a reference snapshot under `tools/ref/`
- keep the forked code in `tools/`
- keep per-user durable memory in `shared/`
- keep rebuildable or disposable artifacts in `cache/`
- surface it in Workspace Hub as a core workspace service, not as a normal repo card

This keeps the repo layout honest:

- `repos/` is for independently runnable project repos
- `tools/` is for shared workspace-supporting code
- `shared/` is for durable workspace-facing data
- `cache/` is for disposable generated data

## Current implementation status

The first MemPalace integration slice is now in place.

Implemented:

- tracked capability registry in `tools/manifests/workspace-capabilities.json`
- local wrappers in `tools/bin/`
- bootstrap and doctor integration
- user-scoped durable state under `shared/mempalace/<user>/`
- user-scoped disposable cache under `cache/mempalace/<user>/`
- initial Workspace Hub core-service support and search indexing
- workspace-safe project and docs mining wrappers
- conversation ingest wrappers for exported chat histories and Codex archived sessions
- explicit closeout wrappers for repo and workspace saves, plus readable Codex transcript export bundles
- repo-local MemPalace target metadata moved under `.workspace/mempalace/`

Still open:

- richer Workspace Hub service views and deeper actions
- privacy-reviewed indexing of any memory-derived metadata beyond service docs and service configuration
- cleaner upstream fix or pin for Chroma telemetry internals beyond the current local no-op override

## Immediate follow-up priority

The current MemPalace integration is working, but the wake-up summary was still biased by lockfile-heavy and other low-signal corpus content.

The next cleanup focus is corpus quality and ingest filtering, not more runtime plumbing.

Current completion list:

- keep low-signal files such as lockfiles, generated output, vendor trees, and build artifacts out of default repo mining
- keep workspace docs and repo closeout mining centered on README, HANDOVER, docs, manifests, and key source or config files
- keep the Workspace Hub memory view explicit about repo-target context instead of presenting MemPalace as just another sidebar detail block
- surface workspace-owned wrapper commands directly in the Hub memory page
- consider later automation for periodic or closeout-triggered saves only after the default corpus quality is trustworthy
- consider later exporter or normalizer support for more conversation sources beyond Codex once the current transcript path is stable

## MemPalace target layout

The preferred shape is:

```text
Codex Workspace/
├── tools/
│   ├── mempalace/
│   ├── bin/
│   │   ├── workspace-memory
│   │   ├── mempalace-start
│   │   └── mempalace-sync
│   └── scripts/
├── shared/
│   └── mempalace/
│       └── <user>/
│           └── home/
│               └── .mempalace/
├── docs/
│   └── .workspace/
│       └── mempalace/
└── repos/<repo>/
    └── .workspace/
        └── mempalace/
├── cache/
    └── mempalace/
        └── <user>/
```

### `tools/mempalace/`

This is the managed forked codebase.

Use:

- `origin` for the workspace owner's fork
- `upstream` for the source repository

Keep workspace-specific glue outside the fork where possible so upstream sync stays easy.

### `shared/mempalace/<user>/`

This is the durable memory home for one operator or user.

Use it for:

- the user-scoped `home/.mempalace/` tree that MemPalace expects
- long-lived palace data
- long-lived knowledge-graph data
- durable logs and exports worth keeping

This data is not the same thing as tracked repo documentation. It is a private or workspace-local memory layer.

### `cache/mempalace/<user>/`

Use this only for disposable material such as:

- temporary ingest artifacts
- benchmark scratch files
- rebuildable search support files
- transient job outputs

Do not treat `cache/` as the source of durable memory.

## Git and update model

The fork model should stay conventional:

1. fork the upstream GitHub repo
2. clone the fork into `tools/mempalace`
3. set `origin` to the fork
4. set `upstream` to the original source repo
5. fast-forward from upstream whenever possible

For MemPalace specifically, the source repo remains:

- [milla-jovovich/mempalace](https://github.com/milla-jovovich/mempalace)

The local reviewed snapshot under `tools/ref/` is only a temporary review aid. Once the forked service is adopted, `tools/ref/` should no longer be the operational copy.

## Workspace integration model

MemPalace should become part of the way Codex Workspace works.

Target integration points:

- bootstrap can verify or install the MemPalace runtime as part of workspace setup
- doctor checks can report whether the memory service is available
- wrapper commands under `tools/bin/` can provide stable entrypoints
- per-user storage paths can be consistent and discoverable
- Workspace Hub can show the service status and related actions

Suggested workspace wrappers:

- `workspace-memory`
- `mempalace-start`
- `mempalace-sync`

These wrappers should own workspace-specific path wiring and environment setup so the upstream fork can stay close to upstream.

Current wrapper coverage includes:

- `workspace-memory export-codex`
- `workspace-memory mine-docs`
- `workspace-memory mine-repo`
- `workspace-memory mine-convos`
- `workspace-memory split-convos`
- `workspace-memory mine-codex`
- `workspace-memory mine-codex-current`
- `workspace-memory save-repo`
- `workspace-memory save-workspace`

For repo or docs targets, wrapper-managed MemPalace metadata should live under `.workspace/mempalace/` rather than at the target root.

The intended operator flow is now:

- use `save-repo <repo>` at repo closeout after meaningful README, HANDOVER, or setup updates
- use `save-workspace` for docs-only or workspace-level planning sessions
- use `export-codex current` when a readable transcript bundle is needed in addition to mining

Codex live-session capture does not require Workspace Hub to be open. The wrapper can resolve the active session from `~/.codex/sessions` by `CODEX_THREAD_ID`, export it into `shared/mempalace/<user>/exports/codex/`, and mine that export directly.

Default repo and docs mining should now be treated as curated ingest, not raw full-tree scanning. If an operator explicitly wants an unfiltered run, that should happen through the low-level CLI path rather than the default workspace closeout commands.

## Workspace Hub model

MemPalace should be represented in Workspace Hub as a core service.

Preferred UI shape:

- a dedicated service page
- status visible from a top-level Core Services or Workspace Services section
- service actions separate from the normal repo inventory

The page should show:

- installed version
- current branch
- fork and upstream remotes
- sync status
- storage paths
- health and runtime status
- last ingest and last sync metadata
- links to config and docs

## Search and retrieval

MemPalace should support workspace retrieval, but it must not replace canonical tracked docs.

Rules:

- tracked repo docs remain the source of truth for durable project guidance
- MemPalace is a retrieval and memory layer, not the canonical project record
- local or per-user memory should stay separated from tracked repo documentation

Workspace Hub search should eventually include:

- service metadata
- selected docs such as README and handover content
- approved memory metadata surfaces

Avoid indexing private user memory into broad workspace views without an explicit privacy decision.

## Promotion rule for other GitHub references

Use `tools/ref/` as the initial review area for outside references.

Then classify each reference into one of four outcomes:

1. `reference-only`
   - keep it in `tools/ref/`
   - do not operationalize it

2. `ability`
   - place it under `repos/abilities/<slug>/`
   - manage install, update, enable, disable, and uninstall through `tools/scripts/manage-workspace-capabilities.sh`
   - do not let repos depend on it silently

3. `repo-level adoption`
   - use it to improve or scaffold a specific repo under `repos/`
   - keep the repo independently runnable

4. `core workspace service`
   - fork it into `tools/<name>/`
   - create durable per-user state in `shared/<name>/<user>/`
   - keep disposable artifacts in `cache/<name>/<user>/`
   - expose it through Workspace Hub as a service

## Intake process for a GitHub URL or new `tools/ref/` entry

Use this process whenever:

- someone pastes a GitHub URL into planning or handover notes
- someone downloads this workspace and wants to add their own reviewed upstream
- a new folder appears under `tools/ref/`
- a reviewed upstream looks important enough to become operational

Do not decide placement by convenience alone. Classify it first.

### Step 1. Start in review mode

Until proven otherwise, a new GitHub source starts as a reviewed reference.

Default action:

- record the source in the appropriate manifest or notes
- keep any snapshot copy under `tools/ref/<name>/`
- do not put it in `repos/` just because it is Git-based
- do not put it in `tools/` as an operational dependency yet

### Step 2. Ask the placement question

Use this decision order:

1. Is this only source material, inspiration, or a pattern library?
   - classify as `reference-only`

2. Is this optional workspace help that users may want to install, update, disable, or uninstall?
   - classify as `ability`

3. Is this meant to stay an independently runnable project with its own lifecycle?
   - classify as `repo-level adoption`

4. Is this meant to become part of how Codex Workspace itself works for all or most users?
   - classify as `core workspace service`

5. Is it still unclear?
   - keep it as `reference-only` until the use case is concrete

When in doubt, do not promote it.

### Step 3. Apply the placement rules

If the answer is `reference-only`:

- keep it in `tools/ref/`
- use it for comparison, extraction, review, or selective copying
- keep update flow lightweight

If the answer is `ability`:

- place the managed repo under `repos/abilities/<slug>/`
- record it in `tools/manifests/workspace-capabilities.json`
- manage lifecycle through `tools/scripts/manage-workspace-capabilities.sh`
- let repos opt into it explicitly rather than assuming it is present

If the answer is `repo-level adoption`:

- place the actual working repo under `repos/`
- keep it independently runnable
- add normal repo docs and optional `.workspace/project.json`
- let Workspace Hub treat it like any other repo

If the answer is `core workspace service`:

- place the forked code under `tools/<name>/`
- place durable per-user state under `shared/<name>/<user>/`
- place disposable generated artifacts under `cache/<name>/<user>/`
- add workspace wrapper scripts in `tools/bin/` or `tools/scripts/`
- document bootstrap, doctor, and update behavior
- plan a Workspace Hub service surface rather than a normal repo card

### Step 4. Record the decision

Every promoted source should have a short written record in docs or handover notes covering:

- source URL
- chosen classification
- why it is not one of the other two classifications
- target location in the workspace
- update owner and sync method
- privacy boundary for any local or per-user data

For a lightweight decision note, use this template:

```md
Source: https://github.com/<owner>/<repo>
Classification: reference-only | ability | repo-level adoption | core workspace service
Reason: <short rationale>
Operational path: tools/ref/<name> | repos/abilities/<name> | repos/<name> | tools/<name>
Durable data path: n/a | repo-local optional | repo-local | shared/<name>/<user>
Update path: <script, manual flow, or upstream/origin model>
```

### Step 5. Revisit only when the usage changes

Promotion should follow demonstrated use, not speculation.

Typical upgrade path:

1. `reference-only`
2. repeat use proves value
3. promote to `repo-level adoption` or `core workspace service`

Do not skip directly to a core service unless the workspace-wide role is already clear.

## Quick decision table

| Question | Outcome | Location |
| --- | --- | --- |
| Is it just a reviewed source or pattern? | `reference-only` | `tools/ref/<name>/` |
| Is it optional installable workspace help? | `ability` | `repos/abilities/<name>/` |
| Is it a standalone project repo? | `repo-level adoption` | `repos/<name>/` |
| Does it become part of how the workspace operates? | `core workspace service` | `tools/<name>/` + `shared/<name>/<user>/` + `cache/<name>/<user>/` |

## Rule for downloaded workspaces

If someone else clones or downloads Codex Workspace and wants to add their own GitHub reference:

1. add it as `reference-only` first
2. document the source and intended use
3. classify it with the decision order above
4. only then move it into `repos/` or `tools/`

The safe default is:

- GitHub URL does not mean repo under `repos/`
- reviewed snapshot does not mean core service
- only repeated or clearly workspace-wide use justifies promotion

## Next phase

After MemPalace, apply the same promotion process to other reviewed GitHub references.

The follow-on phase should:

1. audit the references already present in `tools/ref/` and in `tools/manifests/reference-sources.json`
2. decide which references remain reference-only
3. identify any that should become repo-level patterns or templates
4. identify any that deserve promotion into core workspace services
5. document the chosen placement, owner, sync method, and privacy boundaries for each promoted reference

The key rule is simple:

- references start in `tools/ref/`
- only proven workspace-wide capabilities get promoted into `tools/` plus `shared/`
