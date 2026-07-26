# Loop Engineering Profiles

This directory is the tracked control plane for Codex Workspace loop runs. It
does not replace repository `AGENTS.md` files or state documents.

## Safety model

- The default authority is `draft-fixes`: a run can investigate, create an
  isolated local worktree, and prepare a patch.
- It cannot commit, push, merge, release, deploy, write to connected services,
  or update canonical handovers without an explicit human decision.
- A dirty primary worktree permits triage, but blocks draft preparation.
- The agent that drafts a change must not certify it. A verifier runs the
  profile checks and reports evidence separately.

## Running a profile

Use `tools/scripts/loop-engineering.sh` from the workspace root. It previews by
default; add `--run` to create a disposable evidence bundle.

```sh
tools/scripts/loop-engineering.sh --profiles /path/to/reviewed-profiles.json --profile example-app --phase triage
tools/scripts/loop-engineering.sh --profiles /path/to/reviewed-profiles.json --profile example-app --phase triage --run
tools/scripts/loop-engineering.sh --profiles /path/to/reviewed-profiles.json --profile example-app --phase draft --prepare-worktree --run
tools/scripts/loop-engineering.sh --profiles /path/to/reviewed-profiles.json --profile example-app --phase verify --run-checks --run
```

Run artifacts are written to the selected repository's ignored
`.workspace/agent-artifacts/jobs/` directory. The final report has the fixed
fields required for Triage: trigger, scope, evidence, proposal, verifier
result, checks, and stop reason.

## Automation prompts

Scheduled Codex runs should use only a pilot profile, start in `triage`, and
send an actionable result to Triage. A clean run should record `finding=none`
and archive itself. A draft may be prepared only in a worktree; it remains an
uncommitted proposal for an independent verifier and a human reviewer.
