#!/usr/bin/env sh
set -eu

expected_version="0.9.11"
workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd -P)
repos_root="$workspace_root/repos"
run_mode="dry-run"
repo_arg=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] <repo-path>

Validate a repository for the Graphify pilot. Dry-run by default.
Use --run to replace local ignored graphify-out/ artifacts with a clean code-only graph.
EOF
}

fail() {
  printf 'graphify-repo: %s\n' "$*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run) run_mode="run"; shift ;;
    --help|-h) usage; exit 0 ;;
    *)
      [ -z "$repo_arg" ] || fail "only one repo path may be supplied"
      repo_arg=$1
      shift
      ;;
  esac
done

[ -n "$repo_arg" ] || { usage >&2; exit 1; }
[ -d "$repo_arg" ] || fail "repo path does not exist: $repo_arg"
repo_path=$(CDPATH= cd -- "$repo_arg" && pwd -P)

case "$repo_path/" in
  "$repos_root/"*) ;;
  *) fail "repo must resolve below $repos_root" ;;
esac
[ "$repo_path" != "$repos_root" ] || fail "pass a child repository, not the repos root"

[ -f "$repo_path/.graphifyignore" ] || fail "missing $repo_path/.graphifyignore"
[ -f "$repo_path/.gitignore" ] || fail "missing $repo_path/.gitignore"
grep -Eq '^/?graphify-out/$' "$repo_path/.gitignore" || fail "graphify-out/ is not ignored in $repo_path/.gitignore"

command -v graphify >/dev/null 2>&1 || fail "graphify is not installed"
version_output=$(graphify --version 2>&1) || fail "graphify --version failed"
version=$(printf '%s\n' "$version_output" | awk '{print $NF}')
[ "$version" = "$expected_version" ] || fail "expected Graphify $expected_version, got $version_output"

printf 'Repository: %s\n' "$repo_path"
printf 'Graphify: %s\n' "$version"
printf 'Mode: %s\n' "$run_mode"
printf 'Extraction: code-only (local AST)\n'
printf 'Query logging: disabled\n'

if [ "$run_mode" = "dry-run" ]; then
  printf 'Dry run only. Re-run with --run to generate graphify-out/.\n'
  exit 0
fi

# Always rebuild from the reviewed current allowlist. Incremental output can
# retain nodes produced under an older or broader privacy policy.
rm -rf "$repo_path/graphify-out"

(cd "$repo_path" && \
  export GRAPHIFY_QUERY_LOG_DISABLE=1 GRAPHIFY_OUT=graphify-out && \
  graphify extract . --code-only --no-cluster && \
  graphify cluster-only . --no-label)

for output in graph.html GRAPH_REPORT.md graph.json; do
  [ -f "$repo_path/graphify-out/$output" ] || fail "missing generated output: graphify-out/$output"
done

# Graphify's disposable stat cache records absolute paths, including files that
# were scanned and rejected by the allowlist. It is not required for queries
# and must not survive the privacy gate.
rm -rf "$repo_path/graphify-out/cache"

printf 'Generated local output: %s/graphify-out\n' "$repo_path"
