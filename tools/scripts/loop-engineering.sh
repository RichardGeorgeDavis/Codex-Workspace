#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
profiles_file=${LOOP_ENGINEERING_PROFILES:-"$workspace_root/shared/loop-engineering/profiles.json"}
profile_id=""
phase="triage"
run_mode="dry-run"
run_checks="false"
prepare_worktree="false"
cleanup_worktree="false"
requested_action=""
finding="unknown"
run_id=""
run_id_supplied="false"
repo_override=""

usage() {
  cat <<EOF
Usage: $(basename "$0") --profile <id> [options]

Prepare or verify a bounded Loop Engineering run. Dry-run by default.

Options:
  --phase triage|draft|verify     Run phase (default: triage)
  --run                           Create a disposable local evidence bundle
  --run-checks                    Run the profile's trusted verifier checks
  --prepare-worktree              Create an isolated draft worktree (requires --phase draft --run)
  --cleanup-worktree              Remove an unchanged draft worktree (requires --run and --run-id)
  --finding none|actionable|unknown  Record the triage outcome (default: unknown)
  --requested-action <action>     Refuse an action outside the profile authority
  --profiles <path>               Use an explicit reviewed profile registry
  --repo-dir <path>               Override repository root (tests only)
  --run-id <id>                   Stable run identifier (tests only)
EOF
}

fail() { printf 'loop-engineering: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --profile) profile_id=${2-}; shift 2 ;;
    --phase) phase=${2-}; shift 2 ;;
    --run) run_mode="run"; shift ;;
    --run-checks) run_checks="true"; shift ;;
    --prepare-worktree) prepare_worktree="true"; shift ;;
    --cleanup-worktree) cleanup_worktree="true"; shift ;;
    --finding) finding=${2-}; shift 2 ;;
    --requested-action) requested_action=${2-}; shift 2 ;;
    --profiles) profiles_file=${2-}; shift 2 ;;
    --repo-dir) repo_override=${2-}; shift 2 ;;
    --run-id) run_id=${2-}; run_id_supplied="true"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) fail "unknown option: $1" ;;
  esac
done

[ -n "$profile_id" ] || fail "--profile is required"
[ -f "$profiles_file" ] || fail "profile registry not found: $profiles_file"
command -v jq >/dev/null 2>&1 || fail "jq is required"

case "$phase" in triage|draft|verify) ;; *) fail "invalid phase: $phase" ;; esac
case "$finding" in none|actionable|unknown) ;; *) fail "invalid finding: $finding" ;; esac

profile=$(jq -cer --arg id "$profile_id" '.profiles[] | select(.id == $id)' "$profiles_file") || fail "unknown profile: $profile_id"
allowed_actions=$(printf '%s' "$profile" | jq -cer '.allowedActions')
global_forbidden=$(jq -cer '.globalForbiddenActions' "$profiles_file")
pilot=$(printf '%s' "$profile" | jq -r '.pilot // false')

if [ -n "$requested_action" ]; then
  if printf '%s' "$global_forbidden" | jq -e --arg action "$requested_action" 'index($action) != null' >/dev/null; then
    fail "forbidden action requested: $requested_action"
  fi
  if ! printf '%s' "$allowed_actions" | jq -e --arg action "$requested_action" 'index($action) != null' >/dev/null; then
    fail "action is not allowed by profile: $requested_action"
  fi
fi

if ! printf '%s' "$allowed_actions" | jq -e --arg phase "$phase" 'index($phase) != null' >/dev/null; then
  fail "phase is not allowed by profile: $phase"
fi
if [ "$phase" = "draft" ] && [ "$pilot" != "true" ]; then
  fail "draft phase is disabled until this profile is pilot-enabled"
fi

profile_path=$(printf '%s' "$profile" | jq -er '.path')
repo_dir=${repo_override:-"$workspace_root/$profile_path"}
[ -d "$repo_dir" ] || fail "repository directory not found: $repo_dir"

if [ -z "$run_id" ]; then
  run_id="$(date -u +%Y%m%dT%H%M%SZ)-$profile_id-$phase"
fi
case "$run_id" in *[!A-Za-z0-9._-]*) fail "run id contains unsafe characters" ;; esac

artifact_root="$repo_dir/.workspace/agent-artifacts/jobs"
retention_days=$(jq -er '.statePolicy.archiveRetentionDays // 14' "$profiles_file")
case "$retention_days" in *[!0-9]*|'') fail "archive retention must be a non-negative integer" ;; esac
artifact_dir="$artifact_root/$run_id"
profile_lock="$workspace_root/cache/runtime/loop-engineering/locks/$profile_id.lock"
is_git="false"
if git -C "$repo_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  is_git="true"
fi
dirty="false"
if [ "$is_git" = "true" ] && [ -n "$(git -C "$repo_dir" status --short)" ]; then
  dirty="true"
fi

status="ready"
stop_reason="Awaiting triage evidence."
if [ "$finding" = "none" ]; then
  status="clean"
  stop_reason="No actionable finding; archive the run."
fi
if [ "$phase" = "draft" ] && [ "$dirty" = "true" ]; then
  status="blocked"
  stop_reason="Primary worktree is dirty; drafting is prohibited while triage remains allowed."
fi
if [ "$prepare_worktree" = "true" ] && { [ "$phase" != "draft" ] || [ "$run_mode" != "run" ]; }; then
  fail "--prepare-worktree requires --phase draft --run"
fi
if [ "$cleanup_worktree" = "true" ] && { [ "$run_mode" != "run" ] || [ "$run_id_supplied" != "true" ] || [ "$prepare_worktree" = "true" ]; }; then
  fail "--cleanup-worktree requires --run and --run-id and cannot be combined with --prepare-worktree"
fi

printf 'Profile: %s\nPhase: %s\nRepository: %s\nMode: %s\nStatus: %s\nStop reason: %s\n' \
  "$profile_id" "$phase" "$repo_dir" "$run_mode" "$status" "$stop_reason"

if [ "$run_mode" = "dry-run" ]; then
  printf 'Dry run only. Re-run with --run to create the evidence bundle.\n'
  exit 0
fi

worktree_path="$workspace_root/cache/runtime/loop-engineering/worktrees/$profile_id/$run_id"
branch="codex/loop-$profile_id-${run_id%%-*}"
if [ "$cleanup_worktree" = "true" ]; then
  [ "$is_git" = "true" ] || fail "draft worktrees require a Git repository"
  [ -d "$worktree_path" ] || fail "draft worktree not found: $worktree_path"
  [ -z "$(git -C "$worktree_path" status --short)" ] || fail "draft worktree has changes and must be reviewed manually"
  git -C "$repo_dir" worktree remove "$worktree_path"
  git -C "$repo_dir" branch -d "$branch" >/dev/null 2>&1 || true
  printf 'Removed unchanged draft worktree: %s\n' "$worktree_path"
  exit 0
fi

if [ "$is_git" = "true" ] && ! git -C "$repo_dir" check-ignore -q .workspace/agent-artifacts/jobs/.loop-ignore-probe; then
  fail "artifact path is not ignored by this repository: .workspace/agent-artifacts/"
fi

mkdir -p "$(dirname "$profile_lock")"
if ! mkdir "$profile_lock" 2>/dev/null; then
  lock_pid=$(cat "$profile_lock/pid" 2>/dev/null || true)
  case "$lock_pid" in
    *[!0-9]*|'') fail "overlapping run detected for profile: $profile_id" ;;
    *)
      if kill -0 "$lock_pid" 2>/dev/null; then
        fail "overlapping run detected for profile: $profile_id"
      fi
      rm -f "$profile_lock/pid"
      rmdir "$profile_lock" 2>/dev/null || fail "stale profile lock requires manual cleanup: $profile_lock"
      mkdir "$profile_lock" || fail "unable to acquire profile lock: $profile_id"
      ;;
  esac
fi
printf '%s\n' "$$" >"$profile_lock/pid"
trap 'rm -f "$profile_lock/pid"; rmdir "$profile_lock" 2>/dev/null || true' EXIT HUP INT TERM

if [ "$finding" = "none" ]; then
  artifact_dir="$artifact_root/archive/$run_id"
  mkdir -p "$artifact_root/archive"
  find "$artifact_root/archive" -mindepth 1 -maxdepth 1 -type d -mtime "+$retention_days" -exec rm -rf {} +
fi
mkdir -p "$artifact_dir"

checks_json=$(printf '%s' "$profile" | jq -c '.checks')
printf '%s' "$checks_json" | jq -e 'all(.[]; ((.id | type == "string" and test("^[A-Za-z0-9._-]+$")) and (.command | type == "string")))' >/dev/null \
  || fail "profile contains an unsafe verifier check"
worktree_path=""
if [ "$prepare_worktree" = "true" ] && [ "$status" = "ready" ]; then
  [ "$is_git" = "true" ] || fail "draft worktrees require a Git repository"
  worktree_path="$workspace_root/cache/runtime/loop-engineering/worktrees/$profile_id/$run_id"
  mkdir -p "$(dirname "$worktree_path")"
  git -C "$repo_dir" worktree add -b "$branch" "$worktree_path"
fi

verifier_result="not-run"
check_lines="- Not run."
if [ "$run_checks" = "true" ] && [ "$status" != "blocked" ]; then
  verifier_result="passed"
  check_lines=""
  tab=$(printf '\t')
  printf '%s' "$checks_json" | jq -r '.[] | [.id, .command] | @tsv' | while IFS="$tab" read -r check_id command; do
    if (cd "$repo_dir" && sh -c "$command") >"$artifact_dir/$check_id.log" 2>&1; then
      printf '%s\tpassed\n' "$check_id"
    else
      printf '%s\tfailed\n' "$check_id"
    fi
  done >"$artifact_dir/check-results.tsv"
  if awk -F '\t' '$2 != "passed" { exit 1 }' "$artifact_dir/check-results.tsv"; then :; else
    verifier_result="failed"
    status="verifier-failed"
    stop_reason="Independent verifier check failed; inspect the attached check logs."
  fi
  check_lines=$(awk -F '\t' '{ printf "- %s: %s\n", $1, $2 }' "$artifact_dir/check-results.tsv")
fi

proposal="No patch prepared by this controller."
if [ -n "$worktree_path" ]; then
  proposal="Draft worktree prepared at $worktree_path. An independent implementer must describe any patch here before verification."
fi

cat >"$artifact_dir/report.md" <<EOF
# Loop Engineering Run: $profile_id

## Required Triage Fields

- Trigger: ${phase} run
- Affected scope: $repo_dir
- Evidence: Add concrete file paths, command output, screenshots, or CI links before sending actionable work to Triage.
- Proposed patch or manual action: $proposal
- Verifier result: $verifier_result
- Checks run:
$check_lines
- Stop reason: $stop_reason

## Safety Record

- Authority: draft-fixes
- Primary worktree dirty: $dirty
- Draft worktree: ${worktree_path:-not-created}
- Forbidden actions: commit, push, merge, release, deploy, external writes, WordPress/ManageWP writes, Drive/Sheets writes, and outbound messages.
EOF

jq -n \
  --arg profile "$profile_id" \
  --arg phase "$phase" \
  --arg repo "$repo_dir" \
  --arg status "$status" \
  --arg stopReason "$stop_reason" \
  --arg verifier "$verifier_result" \
  --arg worktree "$worktree_path" \
  --argjson dirty "$dirty" \
  --argjson checks "$checks_json" \
  '{version:1, profile:$profile, phase:$phase, repository:$repo, status:$status, stopReason:$stopReason, verifierResult:$verifier, primaryWorktreeDirty:$dirty, draftWorktree:($worktree | select(length > 0)), checks:$checks}' \
  >"$artifact_dir/run.json"

printf 'Artifact: %s\n' "$artifact_dir"
if [ "$status" = "verifier-failed" ]; then
  exit 2
fi
