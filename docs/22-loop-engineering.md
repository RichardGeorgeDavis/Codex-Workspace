# Loop Engineering

Loop Engineering provides a bounded, dry-run-first controller for recurring
repository triage, isolated draft work and independent verification.

## Profiles

The public registry at `shared/loop-engineering/profiles.json` contains a
neutral Workspace Hub example. Operators should keep private repository
registries outside the public tree and select them explicitly:

```sh
tools/scripts/loop-engineering.sh \
  --profiles /absolute/path/to/reviewed-profiles.json \
  --profile example-app --phase triage
```

`LOOP_ENGINEERING_PROFILES` may provide the same reviewed path. The explicit
flag takes precedence.

Profiles define repository paths, allowed actions, checks and safety
boundaries. The controller refuses actions outside the selected profile and
the global forbidden-action list. Never point it at untrusted configuration:
registered checks are shell commands executed within the selected repository.

## Runtime Behaviour

- The default is a read-only dry run.
- `--run` creates disposable evidence under the selected repository's ignored
  `.workspace/agent-artifacts/jobs/` folder.
- Draft worktrees require `--phase draft --prepare-worktree --run`, a clean
  primary worktree and a pilot-enabled profile.
- `--run-checks` executes only checks from the reviewed registry.
- Active runs are serialised by profile; stale locks are recovered only after
  their process is confirmed dead.
- Commits, pushes, releases, deployments and external writes remain forbidden.

## Verification

Run `tools/scripts/test-loop-engineering.sh` after changing the controller or
registry schema. The fixtures use neutral repositories and do not require an
operator's private registry.
