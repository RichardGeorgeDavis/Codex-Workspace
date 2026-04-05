# 08-first-run-and-updates

## Purpose

This note defines a practical first-run path for people who clone Codex Workspace and want to use it with Codex or another local agent.

It also defines the expected update process for the workspace, Workspace Hub, tracked skills, and optional local-only tooling.

## Important expectation

Codex does not currently show a repo-specific install wizard just because this repository exists.

What a new user gets by default is:

- repo instructions from `AGENTS.md`
- repo docs such as `README.md` and this `docs/` set
- any tracked repo-local Codex skills found in `.codex/skills/`, plus supported compatibility mirrors such as `.agents/skills/`

So if we want a predictable onboarding path, we need to provide it in tracked docs and helper scripts.

## First-run questions

Answer these in order:

1. Do you only want the workspace structure and docs, or do you also want to run Workspace Hub?
2. Do you need Node-only repo support, or mixed-stack support with Python and PHP tools too?
3. Do you manage WordPress projects here and need Local and/or ServBay?
4. Do you want Codex-specific enhancements such as tracked repo skills, selected upstream skills, or MCP integrations?
5. Do you want an optional local workflow-state layer for runs, events, or collections?
6. Do you want a tracked spec-driven layer for larger changes?
7. Do you want repo-local UI preview tooling for frontend repos?
8. Do you want any experimental local-only orchestration tools?

Keep the default path conservative. Install only the layers that solve a real need.

## Setup profiles

### Core

Use this when you want the workspace structure, docs, and helper scripts without turning the workspace into a tool-heavy local platform.

Install or verify:

- `git`
- `rg`
- `jq`
- `fd`
- `tree`

This is the recommended baseline for every user.

### Hub

Use this when you want the local dashboard in `repos/workspace-hub/`.

Install or verify:

- Node.js 20+
- `pnpm` 9+
- a Chrome-compatible browser if you want cover screenshots

Then run:

```bash
cd repos/workspace-hub
pnpm install
pnpm dev
```

### Mixed Stack

Use this when your sibling repos include Python or PHP projects.

Install as needed:

- `python3`
- `pip`
- optional `uv`
- `composer`
- `wp`

Do not install these just because they are listed here. Add them when the repos you actually use need them.

### WordPress

Use this only if your workspace actually contains WordPress projects.

Preferred options:

- Local for existing WordPress projects already managed there
- ServBay when a shared local front door or proxy layer is useful

Do not make either one mandatory for the whole workspace.

### Agent Enhanced

Use this when you want more than plain `AGENTS.md` guidance.

Options:

- tracked repo skills in `.codex/skills/`
- optional compatibility mirrors in `.agents/skills/`
- shared reusable skill sources in `shared/skills/`
- optional tool-neutral sources in `.workspace/skills/`
- selected upstream skills installed with `$skill-installer`
- optional MCP integrations where they add clear value

Current policy:

- prefer tracked `.codex/skills/` for official Codex-visible repo skills
- keep `.agents/skills/` only when repo-local compatibility mirroring helps
- install upstream skills selectively
- keep secrets and machine-specific MCP config local-only
- default MCP examples to `read-only` capability tiers and opt into `mutating` only when required
- keep third-party orchestration local-only unless it proves itself
- if you trial `oh-my-codex`, treat it as an optional external layer or dedicated fork, not as a normal workspace dependency

### Workflow State

Use this when you want repeatable local workflows, run history, and collections without making that state the project source of truth.

Preferred policy:

- keep workflow state local-only by default
- treat tracked docs, specs, manifests, and skills as canonical
- use local workflow state as an operational history and convenience layer

Keep any tool in this category local-only unless a repo explicitly decides otherwise.

### Spec Driven

Use this when larger changes need durable requirements, proposal review, and task breakdowns.

Install or verify:

- Node.js
- `npm`
- `npx`

Optional addition:

- OpenSpec, whose current quick-start on its official site is `npm install -g @fission-ai/openspec@latest`

Recommended workspace usage:

- keep durable capability specs in tracked `openspec/specs/`
- keep larger in-flight change proposals under `openspec/changes/`
- use `tools/templates/openspec/` as a lightweight starter even if you do not adopt more OpenSpec tooling
- use `tools/scripts/init-agent-job-bundle.sh` for local-only evidence and working notes under `cache/context/agents/jobs/`

### UI Previews

Use this when a frontend repo benefits from isolated component or page previews.

Preferred options:

- Ladle for fast React or Vite component previews with minimal overhead
- Storybook when richer docs, addons, or a published component-doc surface matter more than setup cost

Keep either tool repo-local.

Do not make preview tooling a workspace-wide dependency for unrelated repos.

If several repos use Playwright-based smoke checks, keep browser binaries in the
shared workspace cache instead of redownloading Chromium per repo:

```bash
tools/scripts/install-shared-playwright-browser.sh
tools/scripts/install-shared-playwright-browser.sh --run chromium
eval "$(tools/scripts/print-workspace-env.sh)"
tools/scripts/run-with-workspace-env.sh sh -lc 'npx playwright test'
```

For stable workspace use, prefer `cache/playwright-browsers` as the shared
browser location. Workspace Hub now exports the shared Playwright cache path to
repo install and runtime commands automatically, so manual export is mainly for
shell-driven smoke runs outside the Hub.

### Experimental Local

Use this for tools such as personal orchestration layers, generated agent setup, or custom daemons that are useful to one operator but should not become the workspace baseline.

Keep these under local-only locations such as `tools/local/`, ignored config, or your home directory.

This is also where larger harness-style orchestration experiments belong if you want to trial them. Do not make a full harness part of the tracked workspace baseline unless it proves clear value first.

If you keep reviewed upstream snapshots in `tools/ref/`, refresh them with `tools/scripts/sync-reference-snapshots.sh` instead of maintaining them by hand.

## Recommended first run

### 1. Read the docs

Start with:

- `README.md`
- `docs/README.md`
- `docs/08-first-run-and-updates.md`
- `AGENTS.md`

### 2. Run the doctor script

Use the non-destructive environment check:

```bash
tools/scripts/doctor-workspace.sh
```

This reports:

- workspace layout health
- core tool availability
- Workspace Hub readiness
- mixed-stack tool availability
- optional WordPress runtime detection
- Codex-related skill and config state
- recommended setup profiles

### 2a. Bootstrap the workspace safely

Use the workspace bootstrap helper when you want one command that prepares the
safe cache/context folders and, if needed, installs `workspace-hub`
dependencies without touching sibling repos:

```bash
tools/scripts/bootstrap-workspace.sh
tools/scripts/bootstrap-workspace.sh --run
```

This script does not rewrite nested repos under `repos/`.

### 3. Use the profile helper if you want guided next steps

Run:

```bash
tools/scripts/setup-workspace-profile.sh
```

Or choose a profile directly:

```bash
tools/scripts/setup-workspace-profile.sh --profile hub
tools/scripts/setup-workspace-profile.sh --profile agent-enhanced
tools/scripts/setup-workspace-profile.sh --profile workflow-state
tools/scripts/setup-workspace-profile.sh --profile spec-driven
tools/scripts/setup-workspace-profile.sh --profile ui-previews
```

This script does not install anything. It checks the selected profile and prints the next steps that fit it.

### 4. Pick the smallest profile that fits

Recommended order:

1. `Core`
2. `Hub` if you want Workspace Hub
3. `Mixed Stack` only when your repos need it
4. `WordPress` only when your repos need it
5. `Agent Enhanced` only when the extra workflow payoff is clear
6. `Workflow State` only when local run history and collections are worth the added state surface
7. `Spec Driven` only when larger changes benefit from tracked proposal and spec files
8. `UI Previews` only for repos that actually need isolated component or page previews
9. `Experimental Local` only as local-only tooling

### 5. Enable agent-specific additions carefully

For Codex:

- rely on `AGENTS.md` and tracked repo docs first
- add tracked repo skills under `.codex/skills/` when a workflow is stable enough to publish
- mirror them into `.agents/skills/` only when the repo also benefits from the workspace compatibility layer
- keep shared reusable skill source material in `shared/skills/`
- use `tools/scripts/sync-codex-skills.sh` only when you have tracked skill sources to copy into repo skill folders
- install upstream skills such as from `openai/skills` selectively with `$skill-installer`

Do not vendor full external skill catalogs into this workspace.

Useful patterns for heavier agent work can still be adopted selectively:

- progressive skill loading
- explicit execution modes for heavier agent work
- filesystem-backed summaries and outputs for long-running jobs
- selective install or publishing of only the packs you need
- common versus language-specific skill packs
- optional quality-gate and security-check skills

This workspace now includes starter examples under `tools/templates/skills/` for:

- execution-mode conventions
- selective install-profile planning
- common quality and security packs
- a TypeScript review pack

For MCP-specific planning, this workspace also includes starter examples under `tools/templates/mcp/` for:

- `read-only` versus `mutating` capability tiers
- stdio transport hygiene
- local-only secret handling

Treat those as design ideas, not as a reason to add a second mandatory agent platform to the workspace.

### 6. Add spec-driven or preview tooling only where it helps

For larger changes:

- use `tools/templates/openspec/` if you want a tracked spec layer
- keep durable capability requirements under `openspec/specs/`
- keep local task evidence in `cache/context/agents/jobs/` rather than tracked docs when it is still transient
- use `tools/scripts/init-agent-job-bundle.sh --run <job-id>` to create a local artifact bundle

For optional local workflow state:

- keep `.cognetivy/` or similar folders ignored by default
- treat them as a convenience layer for workflows, runs, events, or collections
- move durable conclusions back into tracked docs, specs, manifests, or skills
- do not let local workflow state silently become the only durable place where intent lives

For frontend repos:

- use repo-local stories or compositions instead of a workspace-wide preview dependency
- prefer Ladle first for lighter React or Vite preview needs
- choose Storybook when its docs and addon surface are clearly worth the extra setup
- keep preview files in the repo that owns the UI, not in the workspace root

## Update process

Treat updates as layered maintenance instead of one giant reinstall.

### 1. Update the workspace repo

From the workspace root:

```bash
git pull --ff-only
```

Then review:

- `docs/CHANGELOG.md`

### 2. Refresh Workspace Hub when needed

If `repos/workspace-hub/package.json` or `pnpm-lock.yaml` changed:

```bash
cd repos/workspace-hub
pnpm install
```

Then restart the app if it was running:

```bash
pnpm dev
```

### 3. Refresh tracked Codex skills

If tracked skill sources changed, sync them into repo `.codex/skills/` folders and any `.agents/skills/` compatibility mirrors:

```bash
tools/scripts/sync-codex-skills.sh --all
tools/scripts/sync-codex-skills.sh --run --all
```

Use the dry run first if you want to inspect the planned changes.

### 3a. Run the stable release gate before cutting releases

Before treating a change set as release-ready:

```bash
tools/scripts/release-readiness.sh
```

The stable contract, support matrix, and `.codex/` migration note live in
`docs/10-release-readiness.md`.

### 4. Update sibling repos only when intended

To fast-forward clean repos under `repos/`:

```bash
tools/scripts/update-all.sh
```

That script already skips dirty working trees, detached heads, and repos without an upstream branch.

To update only a named repo group from `tools/manifests/repo-groups.example.json` or your own manifest:

```bash
tools/scripts/update-all.sh --list-groups
tools/scripts/update-all.sh --group core
```

### 5. Update local-only tools separately

This includes:

- Node version managers
- Python environments
- Composer and WP-CLI
- ServBay
- Local
- browser binaries
- private MCP configuration
- personal user-installed skills
- local workflow-state tooling
- repo-local preview tooling such as Ladle or Storybook
- optional spec-driven tooling such as OpenSpec
- experimental local-only orchestration tools

These should not be treated as tracked workspace state.

If you keep ignored upstream reference snapshots in `tools/ref/`, update them separately too:

```bash
tools/scripts/sync-reference-snapshots.sh --list
tools/scripts/sync-reference-snapshots.sh oh-my-codex
tools/scripts/sync-reference-snapshots.sh --run oh-my-codex
tools/scripts/sync-reference-snapshots.sh --run voltagent-awesome-design-md
tools/scripts/use-design-md.sh --refresh
```

The script uses dry-run mode by default. For the current reviewed examples, `oh-my-codex` is the safer candidate for optional local integration, `oh-my-openagent` is better treated as a reference unless its license and runtime are an intentional fit, and `voltagent-awesome-design-md` is the reviewed path for installing or refreshing the local `DESIGN.md` catalog under `tools/ref/`.

If you want a stable workspace-local mirror of just the `DESIGN.md` files, rebuild `cache/design-md/catalog/` with `tools/scripts/use-design-md.sh --refresh`. You can also copy a specific site file into a repo root with `tools/scripts/use-design-md.sh vercel /path/to/repo`.

### 6. Restart Codex when needed

Codex usually detects skill changes automatically, but restart it if:

- a newly installed skill does not appear
- a disabled or enabled skill does not reflect config changes
- a new MCP setup is not being picked up

## Updating skills specifically

There are two different update paths:

### Tracked workspace or repo skills

Update by Git, then sync if needed:

```bash
git pull --ff-only
tools/scripts/sync-codex-skills.sh --run --all
```

### User-installed upstream skills

Update them using the same installer flow you used to add them in the first place.

For Codex, the supported path is:

- `$skill-installer` for adding extra skills
- `~/.codex/config.toml` for disabling them without deleting them

If changes do not appear, restart Codex.

## What this repo should avoid

Do not turn onboarding into:

- a mandatory global install step
- a single shared dependency tree across repos
- a requirement that every user install ServBay, Local, or mixed-stack tooling
- a requirement that every user install experimental orchestration layers
- a requirement that every user add an upstream orchestration layer as a tracked workspace dependency
- a hidden prompt or agent setup blob that cannot be inspected in normal files

The workspace should stay understandable and useful even for someone who only uses the `Core` profile.
