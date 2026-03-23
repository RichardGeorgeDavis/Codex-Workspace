#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
run_mode="dry-run"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] <job-id>

Create a local cache/context bundle for a long-running agent task.
Dry-run by default.
EOF
}

sha256_string() {
  input=$1

  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$input" | sha256sum | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$input" | shasum -a 256 | awk '{print $1}'
    return 0
  fi

  if command -v openssl >/dev/null 2>&1; then
    printf '%s' "$input" | openssl dgst -sha256 | awk '{print $NF}'
    return 0
  fi

  printf '\n'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="run"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -ne 1 ]; then
  usage >&2
  exit 1
fi

job_id=$1
bundle_dir="$workspace_root/cache/context/agents/jobs/$job_id"
created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

printf 'Workspace: %s\n' "$workspace_root"
printf 'Job: %s\n' "$job_id"
printf 'Bundle: %s\n' "$bundle_dir"
printf 'Creates:\n'
printf -- '- %s/plan.md\n' "$bundle_dir"
printf -- '- %s/summary.md\n' "$bundle_dir"
printf -- '- %s/sources.json\n' "$bundle_dir"
printf -- '- %s/audit.jsonl\n' "$bundle_dir"
printf -- '- %s/logs/\n' "$bundle_dir"
printf -- '- %s/screenshots/\n' "$bundle_dir"
printf -- '- %s/outputs/\n' "$bundle_dir"

if [ "$run_mode" = "dry-run" ]; then
  printf 'Dry run only. Re-run with --run to create the bundle.\n'
  exit 0
fi

mkdir -p "$bundle_dir/logs" "$bundle_dir/screenshots" "$bundle_dir/outputs"

create_file_if_missing() {
  file_path=$1
  file_body=$2

  if [ -e "$file_path" ]; then
    printf 'Keeping existing file: %s\n' "$file_path"
    return 0
  fi

  printf '%s' "$file_body" >"$file_path"
  printf 'Created: %s\n' "$file_path"
}

create_file_if_missing "$bundle_dir/plan.md" "# Plan

## Goal

Describe the task objective here.

## Inputs

- repo or workspace area
- key files
- constraints

## Steps

1. Gather context.
2. Make the change.
3. Verify the result.

## Risks

- note anything likely to regress
"

create_file_if_missing "$bundle_dir/summary.md" "# Summary

## Outcome

Summarize what changed and why.

## Verification

- list checks run
- note checks skipped

## Follow-up

- record remaining risks or next actions
"

create_file_if_missing "$bundle_dir/sources.json" "{
  \"version\": 1,
  \"jobId\": \"$job_id\",
  \"createdAt\": \"$created_at\",
  \"inputs\": []
}
"

audit_payload="bundle.created|$job_id|$created_at|plan.md,summary.md,sources.json,logs/,screenshots/,outputs/"
audit_hash=$(sha256_string "$audit_payload")
audit_line="{\"version\":1,\"index\":1,\"ts\":\"$created_at\",\"event\":\"bundle.created\",\"jobId\":\"$job_id\",\"prevHash\":null,\"hash\":\"$audit_hash\",\"files\":[\"plan.md\",\"summary.md\",\"sources.json\",\"logs/\",\"screenshots/\",\"outputs/\"]}"
create_file_if_missing "$bundle_dir/audit.jsonl" "$audit_line
"

printf 'Bundle ready.\n'
