# 04-build-order-and-dod

## Purpose

This file defines the recommended implementation order for Codex Workspace and Workspace Hub, along with clear milestones and definitions of done.

The goal is to reduce drift, avoid over-building too early, and give Codex a practical sequence to follow.

This file should be read together with:

- `00-overview.md`
- `01-codex-workspace-handover.md`
- `02-local-runtime-handover.md`
- `03-workspace-hub-build-spec.md`
- `AGENTS.md`

## Delivery philosophy

Build the system in layers.

Do not attempt to solve:
- every runtime edge case
- every project type
- full automation of every reverse-proxy or mapped-host setup
- advanced process orchestration
- deep Git tooling
- rich analytics

in the first pass.

The first pass should prioritise:
- working structure
- working repo discovery
- working launch/open flows
- clear metadata
- clean manual override paths

## Recommended implementation order

## Stage 1 — Create the workspace foundation

### Objective
Create the base folder structure, shared documents, and shared utility locations.

### Tasks
- create the `Codex Workspace` root folder
- create the required top-level folders
- place the canonical handover docs in `docs/`
- create a placeholder `repo-index.json`
- create a basic `workspace.code-workspace`

### Definition of done
Stage 1 is complete when:

- the workspace exists at the agreed path
- `docs/`, `repos/`, `tools/`, `cache/`, and `shared/` all exist
- the canonical handover docs are present in `docs/`
- the shared metadata layer is present
- there is a clear place for future scripts and metadata
- no repo-specific assumptions have been baked into the workspace structure

## Stage 2 — Set up shared tooling and caches

### Objective
Create the performance layer without compromising repo independence.

### Tasks
- define shared cache locations
- add placeholder scripts in `tools/scripts/`
- add template locations in `tools/templates/`
- document intended machine-level tools
- prepare helper scripts for future clone/update/bootstrap use

### Suggested initial scripts
- `clone-all.sh`
- `update-all.sh`
- `detect-repo-type.sh`
- `bootstrap-repo.sh`

### Definition of done
Stage 2 is complete when:

- the `tools/` structure is usable
- the `cache/` structure is ready for package manager mapping
- the workspace supports sharing caches rather than installs
- repo independence remains intact

## Stage 3 — Create the Workspace Hub repository

### Objective
Scaffold the separate `workspace-hub` repo as a first-class project inside `repos/`.

### Tasks
- create `repos/workspace-hub/`
- scaffold the preferred app stack
- create initial README
- create initial app shell
- ensure the Hub runs on its own without any optional proxy front door

### Definition of done
Stage 3 is complete when:

- `workspace-hub` exists as a standalone repo
- it can be installed and run independently
- the app shell launches locally
- the README explains the purpose and local run instructions

## Stage 4 — Build repo discovery and listing

### Objective
Give the Hub real visibility into the workspace.

### Tasks
- scan sibling repos under `repos/`
- ignore hidden/noise folders where appropriate
- list discovered repos in the UI
- show basic metadata such as name and path
- add a refresh mechanism

### Definition of done
Stage 4 is complete when:

- the Hub can discover multiple repos reliably
- discovered repos are shown in a usable list or grid
- refresh works
- the Hub remains fast and stable with a growing repo count

## Stage 5 — Add repo detection and manifest support

### Objective
Let the Hub understand what each repo is and how it should be treated.

### Tasks
- implement conservative file-based repo detection
- detect common stack signals
- read `.workspace/project.json` where present
- allow manifest values to override or refine detection
- display detected type and preferred mode

### Definition of done
Stage 5 is complete when:

- repos can be classified as `wordpress`, `static`, `vite`, `threejs`, `node-app`, `php`, or `other`
- manifest-based overrides work
- uncertain repos do not cause crashes or bad assumptions
- repo cards/details show meaningful classification

## Stage 6 — Add core actions

### Objective
Make the Hub useful even before full process orchestration is complete.

### Tasks
- open repo in Finder
- open preview URL where known
- open README where available
- optionally open in terminal/editor if straightforward

### Definition of done
Stage 6 is complete when:

- each repo has practical actions available
- a user can navigate from Hub to repo or preview quickly
- unsupported actions fail gracefully

## Stage 7 — Add start/stop/restart behaviour

### Objective
Turn the Hub into a real local launcher.

### Tasks
- run repo-native dev commands
- track process state
- expose stop/restart actions
- surface startup failures clearly
- support basic port awareness

### Definition of done
Stage 7 is complete when:

- supported repos can be started from the Hub
- running/stopped/error state is visible
- stop and restart work reliably
- failure cases are understandable
- the Hub does not assume all repos share the same command model

## Stage 8 — Add persisted metadata

### Objective
Improve daily usability.

### Tasks
- persist favourites
- persist tags
- persist notes
- persist last opened
- persist manual overrides where needed

### Definition of done
Stage 8 is complete when:

- user preferences survive app restarts
- metadata remains lightweight and non-sensitive
- the Hub becomes meaningfully more useful over repeated use

## Stage 9 — Add mapped-host-aware integration

### Objective
Allow the Hub to participate in a single-domain local model without becoming dependent on it.

### Tasks
- add settings for optional proxy base domain and preview preference
- support base-domain configuration
- generate mapped-host preview links when configured
- allow switching between direct and mapped-host preview modes

### Definition of done
Stage 9 is complete when:

- the Hub works perfectly without optional proxy tooling
- the Hub can also generate or use mapped-host links when enabled
- the direct preview path remains available
- repo handling does not become proxy-only

## Stage 10 — Refine and harden

### Objective
Polish the system for real daily use.

### Tasks
- improve filtering and search
- improve error display
- improve logs or status information
- refine manual overrides
- add health checks where useful
- optimise startup and scanning performance

### Definition of done
Stage 10 is complete when:

- the Hub feels practical and stable
- common tasks are fast
- classification and runtime behaviour are understandable
- the system is ready for regular use

## Suggested milestone grouping

## Milestone A — Workspace ready
Includes:
- Stage 1
- Stage 2

Outcome:
- shared workspace exists
- shared structure and documentation are in place

## Milestone B — Hub visible
Includes:
- Stage 3
- Stage 4
- Stage 5

Outcome:
- Hub exists
- repos are discoverable
- repos are classified

## Milestone C — Hub useful
Includes:
- Stage 6
- Stage 7

Outcome:
- Hub can open and launch repos
- Hub is already useful day to day

## Milestone D — Hub polished
Includes:
- Stage 8
- Stage 9
- Stage 10

Outcome:
- metadata, optional mapped-host support, and refinement are in place

## Definition of done for the overall project

The project is done for v1 when all of the following are true:

- the desktop workspace exists at the agreed path
- all repos live under `repos/`
- shared tooling and caches have a clear place
- `workspace-hub` exists as a separate repo
- the Hub can discover sibling repos
- the Hub can classify repos conservatively
- the Hub can read optional manifests
- the Hub can open repos and previews
- the Hub can start and stop supported repos
- the Hub remains useful without optional proxy tooling
- the Hub can optionally support mapped-host preview links
- the system does not rely on shared project dependency folders
- the system remains understandable and maintainable

## Explicit out-of-scope items for v1

These may be added later, but should not block v1:

- full automatic environment provisioning for every stack
- Docker-first orchestration
- automatic Local site creation
- full Git operations dashboard
- CI/CD integration
- deployment tooling
- team/user permissions
- advanced analytics
- screenshot generation for every repo
- automatic SSL/domain provisioning beyond what your local stack already provides

## Quality bar

When Codex builds this system, prefer:

- visible progress
- small working milestones
- conservative assumptions
- practical manual override points
- lightweight persistence
- clear repo-type handling
- stable local usage over ambitious complexity

## Acceptance checklist

A final acceptance check for v1 should confirm:

- [ ] Workspace root exists in the intended location
- [ ] Expected top-level folders exist
- [ ] Handover docs are stored canonically in `docs/`
- [ ] Shared metadata exists where expected
- [ ] `workspace-hub` exists as a separate repo
- [ ] Hub can run locally
- [ ] Hub can discover sibling repos
- [ ] Hub can detect or read repo types
- [ ] Hub can show repo details
- [ ] Hub can open previews
- [ ] Hub can start and stop supported repos
- [ ] Hub can store useful non-sensitive metadata
- [ ] Hub works without optional proxy front door
- [ ] Hub can optionally generate or use mapped-host preview links
- [ ] Shared caches are separated from repo-specific installs
- [ ] No shared `node_modules` or equivalent cross-repo dependency structure has been introduced
