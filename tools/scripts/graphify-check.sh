#!/usr/bin/env sh
set -eu

expected_version="0.9.11"
workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd -P)

fail() {
  printf 'graphify-check: %s\n' "$*" >&2
  exit 1
}

command -v uv >/dev/null 2>&1 || fail "uv is required"
command -v graphify >/dev/null 2>&1 || fail "graphify is not installed; install graphifyy==$expected_version with uv"

version_output=$(graphify --version 2>&1) || fail "graphify --version failed"
version=$(printf '%s\n' "$version_output" | awk '{print $NF}')
[ "$version" = "$expected_version" ] || fail "expected $expected_version, got $version_output"

for required in \
  "$workspace_root/docs/23-codebase-knowledge-graph.md" \
  "$workspace_root/docs/graphify-repo-adoption-register.md" \
  "$workspace_root/docs/graphify-schedules.md" \
  "$workspace_root/docs/operations/graphify-troubleshooting.md"; do
  [ -f "$required" ] || fail "missing required file: $required"
done

printf 'Graphify %s is ready.\n' "$version"
printf 'Workspace: %s\n' "$workspace_root"
