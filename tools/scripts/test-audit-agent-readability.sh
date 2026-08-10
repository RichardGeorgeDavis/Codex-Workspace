#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
workspace_root="$(cd "$script_dir/../.." && pwd -P)"
output="$("$script_dir/audit-agent-readability.sh")"

printf '%s' "$output" | grep -q '# Agent-readability audit'
printf '%s' "$output" | grep -q '## Route checks'
printf '%s' "$output" | grep -q '## Local link validation'
printf '%s' "$output" | grep -q '## Duplicate guidance candidates'
printf '%s' "$output" | grep -q 'Workspace side-load entry:'

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM
if "$script_dir/audit-agent-readability.sh" --report "$tmp" >/dev/null 2>&1; then
  echo 'Expected outside-artifact report path rejection' >&2
  exit 1
fi

artifact_dir="$workspace_root/.workspace/agent-artifacts/test-audit-agent-readability"
mkdir -p "$artifact_dir"
trap 'rm -rf "$tmp" "$artifact_dir"' EXIT INT TERM
"$script_dir/audit-agent-readability.sh" --report "$artifact_dir" >/dev/null
test -f "$artifact_dir/report.md"
grep -q 'Recommendations requiring approval' "$artifact_dir/report.md"
rm -f "$artifact_dir/report.md"
"$script_dir/audit-agent-readability.sh" --report '.workspace/agent-artifacts/test-audit-agent-readability' >/dev/null
test -f "$artifact_dir/report.md"
rm -rf "$artifact_dir"

echo 'agent-readability audit checks passed'
