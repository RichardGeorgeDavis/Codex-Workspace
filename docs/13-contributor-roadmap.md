# Contributor Roadmap

This is the public contribution map for Codex Workspace. It is written for both outside contributors and existing collaborators who want a faster path into the repo.

The main concrete contributor surface today is [`repos/workspace-hub/`](../repos/workspace-hub/README.md). The rest of the repo supports that app with workspace docs, templates, scripts, metadata conventions, and optional capability plumbing.

## Where To Start

- Read [../README.md](../README.md) for the short public overview.
- Read [../.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) for the lightweight PR path and guardrails.
- Browse current [`help wanted`](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22help%20wanted%22) and [`good first issue`](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22good%20first%20issue%22) issues.
- Use [GitHub Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a) for setup or usage questions.

## Label Taxonomy

- `good first issue`: Small, self-contained work that should not require deep workspace history.
- `help wanted`: A maintainer is actively inviting a contribution on this task.
- `documentation`: README, docs, examples, or contributor-facing wording.
- `workspace-hub`: UI, API, runtime, or tests inside `repos/workspace-hub/`.
- `scripts`: Workspace scripts, templates, wrappers, or command ergonomics.
- `needs-repro`: A report is plausible but still needs a tighter reproduction path or acceptance proof.
- `design`: UI copy, layout, visual polish, or empty-state quality in Workspace Hub.

## Now / Next / Later

- Now: Workspace Hub UX, docs clarity, manifest examples, repo-classification behavior, and script ergonomics are stable enough for outside contribution.
- Next: Contributor-friendly observability, tighter verification flows, screenshot and preview reliability, and more explicit classification explanations in the UI.
- Later: Broader capability-promotion work, deeper workspace-memory workflows, and larger architecture changes after the public surfaces settle.
- Out of scope for now: Shared dependency installs across unrelated repos, making ServBay mandatory, or forcing every repo through one centralized runtime model.

## Ready-To-Open Starter Issues

These are intentionally scoped for `help wanted` triage. Several are also suitable for `good first issue`.

### 1. Clarify the “try Workspace Hub first” path

- Labels: `help wanted`, `documentation`, `good first issue`
- Problem statement: The public docs still ask readers to absorb too much workspace context before they understand how to try the most concrete product.
- Affected area: Root README plus linked first-run docs.
- Expected outcome: A first-time reader can move from the top of the repo to a working Hub trial without reading the entire docs tree.
- Constraints or non-goals: No runtime or architecture changes.
- Minimal verification: Follow the revised path from README to Hub startup on a clean checkout.

### 2. Add manifest examples for common repo types

- Labels: `help wanted`, `documentation`
- Problem statement: The workspace favors lightweight manifests, but contributors do not yet get one short example per common repo type.
- Affected area: `docs/09-new-repo-baseline.md`, templates, and manifest docs.
- Expected outcome: Add copy-pasteable examples for Vite, static, PHP, and WordPress repos, including when no explicit manifest is needed.
- Constraints or non-goals: Do not introduce a mandatory manifest for every repo.
- Minimal verification: A contributor can point at one example for each repo type without inferring fields from prose alone.

### 3. Improve the empty state when Workspace Hub finds no repos

- Labels: `help wanted`, `workspace-hub`, `design`, `good first issue`
- Problem statement: A workspace with no useful detected repos should guide the user toward the next action instead of just feeling blank.
- Affected area: Workspace Hub discovery UI.
- Expected outcome: Clear empty-state copy and links that explain where repos belong and how to onboard one.
- Constraints or non-goals: Do not redesign the whole discovery layout.
- Minimal verification: Launch the Hub against an empty or fixture workspace and confirm the next action is obvious.

### 4. Surface classification reasons more explicitly in repo details

- Labels: `help wanted`, `workspace-hub`
- Problem statement: Classification is intentionally conservative, but the rationale is still too implicit for contributors trying to debug repo detection.
- Affected area: Workspace Hub repo details and related docs.
- Expected outcome: Make the file or signal basis for the current classification easier to inspect.
- Constraints or non-goals: No rewrite of the discovery engine.
- Minimal verification: On a mixed workspace, a contributor can explain why a repo was classified as Vite, static, WordPress, PHP, or unknown.

### 5. Tighten `doctor-workspace.sh` next-step guidance

- Labels: `help wanted`, `scripts`, `good first issue`
- Problem statement: The doctor script can identify missing tools, but its next-step guidance can still be more explicit for common setup gaps.
- Affected area: `tools/scripts/doctor-workspace.sh` and related docs.
- Expected outcome: More actionable follow-up messages for missing Node, pnpm, `gh`, or optional mixed-stack tools.
- Constraints or non-goals: Keep the script non-destructive.
- Minimal verification: Run the doctor in a controlled environment or fixture and confirm the output points to the right follow-up doc or command.

### 6. Add cover-screenshot troubleshooting guidance for repo intake

- Labels: `help wanted`, `documentation`, `good first issue`
- Problem statement: Repo cover capture is a useful feature, but the failure modes are not yet explained clearly enough for new contributors.
- Affected area: Workspace Hub docs and README cross-links.
- Expected outcome: A short troubleshooting section covering browser path, settle timings, and expected repo cover behavior.
- Constraints or non-goals: No screenshot implementation changes.
- Minimal verification: A contributor can diagnose the common failure cases from docs alone.

### 7. Polish capability-panel copy for contributor comprehension

- Labels: `help wanted`, `workspace-hub`, `design`
- Problem statement: The capability panel exposes useful workspace state, but some of its language still assumes maintainer context.
- Affected area: Workspace Hub UI copy and related docs.
- Expected outcome: Terms such as `reference-only`, `ability`, and `core service` read more clearly to a first-time contributor.
- Constraints or non-goals: Keep the current capability model and backend shape.
- Minimal verification: A new contributor can explain the panel categories without reading deep architecture docs first.

## Maintainer Notes

- Prefer publishing `help wanted` issues from the dedicated [Help wanted task template](../.github/ISSUE_TEMPLATE/help_wanted_task.md).
- Add `good first issue` only when the task is genuinely self-contained and the acceptance path is short.
- Use `needs-repro` on plausible bug reports that still need a deterministic reproduction path before they become contribution-ready.
