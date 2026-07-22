#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
runner="$workspace_root/tools/scripts/loop-engineering.sh"
fixture=$(mktemp -d "${TMPDIR:-/tmp}/loop-engineering.XXXXXX")
trap 'rm -rf "$fixture"' EXIT HUP INT TERM

repo="$fixture/repo"
mkdir -p "$repo"
git -C "$repo" init -q
git -C "$repo" config user.email loop@example.test
git -C "$repo" config user.name "Loop Test"
printf 'base\n' >"$repo/file.txt"
printf '.workspace/agent-artifacts/\n' >"$repo/.gitignore"
git -C "$repo" add file.txt
git -C "$repo" add .gitignore
git -C "$repo" commit -qm initial

profiles="$fixture/profiles.json"
cat >"$profiles" <<EOF
{
  "version": 1,
  "globalForbiddenActions": ["commit", "deploy", "external-write"],
  "profiles": [{
    "id": "fixture",
    "path": "unused",
    "pilot": true,
    "allowedActions": ["triage", "draft", "verify"],
    "checks": [{"id": "passes", "command": "test -f file.txt"}],
    "boundaries": []
  }, {
    "id": "failing-fixture",
    "path": "unused",
    "pilot": true,
    "allowedActions": ["triage", "draft", "verify"],
    "checks": [{"id": "fails", "command": "false"}],
    "boundaries": []
  }]
}
EOF

assert_contains() { grep -F "$2" "$1" >/dev/null || { printf 'missing %s in %s\n' "$2" "$1" >&2; exit 1; }; }

# Clean triage previews without writing and a clean finding records an archive outcome.
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --finding none >"$fixture/clean.out"
assert_contains "$fixture/clean.out" 'Status: clean'
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --finding none --run --run-id clean >"$fixture/clean-run.out"
assert_contains "$repo/.workspace/agent-artifacts/jobs/archive/clean/report.md" 'No actionable finding; archive the run.'
mkdir -p "$repo/.workspace/agent-artifacts/jobs/archive/expired"
touch -t 202001010000 "$repo/.workspace/agent-artifacts/jobs/archive/expired"
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --finding none --run --run-id clean-retention >"$fixture/retention.out"
test ! -d "$repo/.workspace/agent-artifacts/jobs/archive/expired"
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase verify --run --run-checks --run-id passing >"$fixture/passing.out"
assert_contains "$repo/.workspace/agent-artifacts/jobs/passing/report.md" 'passes: passed'

# A dirty primary checkout blocks drafting but not triage.
printf 'dirty\n' >>"$repo/file.txt"
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase draft >"$fixture/dirty.out"
assert_contains "$fixture/dirty.out" 'Status: blocked'
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage >"$fixture/dirty-triage.out"
assert_contains "$fixture/dirty-triage.out" 'Status: ready'
git -C "$repo" checkout -- file.txt

# Failed verification creates evidence and returns a non-zero status.
if "$runner" --profiles "$profiles" --repo-dir "$repo" --profile failing-fixture --phase verify --run --run-checks --run-id failing >"$fixture/failing.out" 2>&1; then
  printf 'expected failing verifier to return non-zero\n' >&2
  exit 1
fi
assert_contains "$repo/.workspace/agent-artifacts/jobs/failing/report.md" 'Verifier result: failed'

# A non-pilot profile cannot draft, and a prepared clean draft can be removed explicitly.
sed 's/"pilot": true/"pilot": false/' "$profiles" >"$fixture/non-pilot.json"
if "$runner" --profiles "$fixture/non-pilot.json" --repo-dir "$repo" --profile fixture --phase draft >"$fixture/non-pilot.out" 2>&1; then
  printf 'expected non-pilot draft to fail\n' >&2
  exit 1
fi
assert_contains "$fixture/non-pilot.out" 'pilot-enabled'
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase draft --run --prepare-worktree --run-id draft >"$fixture/draft.out"
assert_contains "$repo/.workspace/agent-artifacts/jobs/draft/report.md" 'Draft worktree prepared'
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase draft --run --cleanup-worktree --run-id draft >"$fixture/cleanup.out"
test ! -d "$workspace_root/cache/runtime/loop-engineering/worktrees/fixture/draft"

# Existing profile lock rejects overlapping runs; forbidden actions are rejected before a run starts.
mkdir -p "$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock"
printf '%s\n' "$$" >"$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock/pid"
if "$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --run --run-id overlap >"$fixture/overlap.out" 2>&1; then
  printf 'expected overlap to fail\n' >&2
  exit 1
fi
assert_contains "$fixture/overlap.out" 'overlapping run detected'
rm -f "$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock/pid"
rmdir "$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock"
mkdir -p "$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock"
printf '%s\n' 999999 >"$workspace_root/cache/runtime/loop-engineering/locks/fixture.lock/pid"
"$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --run --run-id stale-lock >"$fixture/stale-lock.out"
test -f "$repo/.workspace/agent-artifacts/jobs/stale-lock/report.md"
if "$runner" --profiles "$profiles" --repo-dir "$repo" --profile fixture --phase triage --requested-action deploy >"$fixture/forbidden.out" 2>&1; then
  printf 'expected forbidden action to fail\n' >&2
  exit 1
fi
assert_contains "$fixture/forbidden.out" 'forbidden action requested: deploy'

printf 'loop-engineering tests passed\n'
