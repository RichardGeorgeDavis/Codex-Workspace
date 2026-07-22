#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd -P)
source_runner="$workspace_root/tools/scripts/graphify-repo.sh"
fixture=$(mktemp -d "${TMPDIR:-/tmp}/graphify-repo.XXXXXX")
trap 'rm -rf "$fixture"' EXIT HUP INT TERM

mkdir -p "$fixture/tools/scripts" "$fixture/repos/pilot" "$fixture/bin"
cp "$source_runner" "$fixture/tools/scripts/graphify-repo.sh"
runner="$fixture/tools/scripts/graphify-repo.sh"
repo="$fixture/repos/pilot"

printf '*\n!src/\n!src/**\n' >"$repo/.graphifyignore"
printf 'graphify-out/\n' >"$repo/.gitignore"

cat >"$fixture/bin/graphify" <<'EOF'
#!/usr/bin/env sh
set -eu
if [ "${1-}" = "--version" ]; then
  printf 'graphify 0.9.11\n'
  exit 0
fi
[ "${GRAPHIFY_QUERY_LOG_DISABLE-}" = "1" ] || exit 41
[ "${GRAPHIFY_OUT-}" = "graphify-out" ] || exit 42
printf '%s\n' "$*" >>graphify-invocation.txt
mkdir -p graphify-out
if [ "${1-}" = "cluster-only" ]; then
  printf '<html></html>\n' >graphify-out/graph.html
  printf '# Report\n' >graphify-out/GRAPH_REPORT.md
else
  printf '{"nodes":[],"links":[]}\n' >graphify-out/graph.json
  mkdir -p graphify-out/cache
  printf '/private/fixture/path\n' >graphify-out/cache/stat-index.json
fi
EOF
chmod +x "$fixture/bin/graphify"

PATH="$fixture/bin:$PATH" "$runner" "$repo" >"$fixture/dry-run.out"
grep -F 'Mode: dry-run' "$fixture/dry-run.out" >/dev/null
test ! -e "$repo/graphify-out"

if PATH="$fixture/bin:$PATH" "$runner" "$fixture" >"$fixture/outside.out" 2>&1; then
  printf 'expected outside-repos path to fail\n' >&2
  exit 1
fi
grep -F 'must resolve below' "$fixture/outside.out" >/dev/null

mv "$repo/.graphifyignore" "$repo/.graphifyignore.off"
if PATH="$fixture/bin:$PATH" "$runner" "$repo" >"$fixture/missing-ignore.out" 2>&1; then
  printf 'expected missing .graphifyignore to fail\n' >&2
  exit 1
fi
mv "$repo/.graphifyignore.off" "$repo/.graphifyignore"

sed 's/0\.9\.11/9.9.9/' "$fixture/bin/graphify" >"$fixture/bin/graphify-wrong"
mv "$fixture/bin/graphify" "$fixture/bin/graphify-good"
mv "$fixture/bin/graphify-wrong" "$fixture/bin/graphify"
chmod +x "$fixture/bin/graphify"
if PATH="$fixture/bin:$PATH" "$runner" "$repo" >"$fixture/version.out" 2>&1; then
  printf 'expected version mismatch to fail\n' >&2
  exit 1
fi
mv "$fixture/bin/graphify-good" "$fixture/bin/graphify"

mkdir -p "$repo/graphify-out"
printf 'stale graph from older policy\n' >"$repo/graphify-out/stale-policy-output.txt"
PATH="$fixture/bin:$PATH" "$runner" --run "$repo" >"$fixture/run.out"
grep -Fx 'extract . --code-only --no-cluster' "$repo/graphify-invocation.txt" >/dev/null
grep -Fx 'cluster-only . --no-label' "$repo/graphify-invocation.txt" >/dev/null
test -f "$repo/graphify-out/graph.json"
test ! -e "$repo/graphify-out/cache"
test ! -e "$repo/graphify-out/stale-policy-output.txt"

printf 'graphify-repo tests passed\n'
