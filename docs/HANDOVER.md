# Codex Workspace Handover

Status: public framework operational
Last reviewed: 2026-07-27

## Current Public State

- Workspace Hub remains the tracked public runtime and launcher example.
- Everything below `repos/` is ignored except the tracked public
  `repos/workspace-hub/` implementation.
- Repo discovery treats `repos/` as independently managed checkouts and does
  not require private repositories to exist.
- Loop Engineering ships with a neutral example registry and supports an
  explicit reviewed registry through `--profiles` or
  `LOOP_ENGINEERING_PROFILES`.
- Local-model context defaults to loopback Ollama and supports explicit private
  configuration through `--profiles` or `OLLAMA_CONTEXT_PROFILES`.
- Public TomeVault mirrors are generated only from
  `tools/manifests/tomevault-skills.json`.
- Repo-specific commands, provider credentials, operator routing policy and
  private operational history are intentionally outside the public tree.

## Private Split Closeout

- The public skill distribution now contains only generic framework skills:
  agent-tooling diagnosis, repo onboarding, runtime triage, workspace
  maintenance and quality checks, placeholder-only SSH guidance, and generic
  quality/security/TypeScript templates.
- The Neo4j memory-hooks experiment, repo-specific integration skills,
  provider helpers, private launcher implementations and operator history are
  removed from public sources and manifests.
- Ignored links under `tools/local/commands/` and `tools/local/agents/` preserve
  Finder and local-agent convenience without tracking their private targets.
- Reachable Git history still contains earlier operational identifiers. The
  current cleanup removes them from the branch tip; it does not rewrite
  history. A separate coordinated rewrite remains required if complete
  historical purging is approved.

## Verification

Before release, run:

```sh
tools/scripts/doctor-workspace.sh
tools/scripts/test-loop-engineering.sh
tools/scripts/test-local-model-context.sh
tools/scripts/test-public-release-hygiene.sh
tools/scripts/check-public-secrets.sh
tools/scripts/release-readiness.sh
```

Inspect `git status --short` before claiming a clean worktree. Generated cache
packets and ignored local runtime state are not canonical documentation.
