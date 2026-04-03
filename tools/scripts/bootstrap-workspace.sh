#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
workspace_hub_dir="$workspace_root/repos/workspace-hub"
run_mode="dry-run"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run]

Prepare Codex Workspace for first use without touching sibling repos.

Default behavior is a dry run. Use --run to:
- create safe cache/context folders if they are missing
- install Workspace Hub dependencies with pnpm if node_modules is missing

This script does not install system packages and does not mutate repos under repos/
other than repos/workspace-hub.
EOF
}

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-22s %s\n' "$level" "$label" "$detail"
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
      usage >&2
      exit 1
      ;;
  esac
done

printf 'Codex Workspace bootstrap\n'
printf 'Workspace: %s\n' "$workspace_root"
printf 'Mode: %s\n\n' "$run_mode"

for required_dir in docs repos tools cache shared; do
  if [ -d "$workspace_root/$required_dir" ]; then
    print_status "[ok]" "$required_dir/" "present"
  else
    print_status "[fail]" "$required_dir/" "missing"
    exit 1
  fi
done

if [ ! -d "$workspace_hub_dir" ]; then
  print_status "[fail]" "workspace-hub" "missing at $workspace_hub_dir"
  exit 1
fi

if [ ! -f "$workspace_hub_dir/package.json" ]; then
  print_status "[fail]" "workspace-hub" "package.json missing"
  exit 1
fi

printf '\nSafe workspace dirs\n'
for target_dir in \
  "$workspace_root/cache/context" \
  "$workspace_root/cache/context/agents" \
  "$workspace_root/cache/context/agents/jobs" \
  "$workspace_root/cache/context/workspace" \
  "$workspace_root/cache/playwright-browsers"
do
  if [ -d "$target_dir" ]; then
    print_status "[ok]" "$(basename "$target_dir")" "$target_dir"
    continue
  fi

  if [ "$run_mode" = "run" ]; then
    mkdir -p "$target_dir"
    print_status "[ok]" "$(basename "$target_dir")" "created $target_dir"
  else
    print_status "[plan]" "$(basename "$target_dir")" "would create $target_dir"
  fi
done

printf '\nWorkspace Hub deps\n'
if [ -d "$workspace_hub_dir/node_modules" ]; then
  print_status "[ok]" "node_modules" "already installed in repos/workspace-hub"
else
  if ! command -v pnpm >/dev/null 2>&1; then
    print_status "[warn]" "pnpm" "missing; cannot install Workspace Hub deps automatically"
  elif [ "$run_mode" = "run" ]; then
    (cd "$workspace_hub_dir" && pnpm install --frozen-lockfile)
    print_status "[ok]" "node_modules" "installed in repos/workspace-hub"
  else
    print_status "[plan]" "node_modules" "would run: cd repos/workspace-hub && pnpm install --frozen-lockfile"
  fi
fi

printf '\nNext steps\n'
printf -- '- Run tools/scripts/doctor-workspace.sh\n'
printf -- '- Export shared env when needed: eval "$(tools/scripts/print-workspace-env.sh)"\n'
printf -- '- Start Workspace Hub with: cd repos/workspace-hub && pnpm dev\n'
printf -- '- Use tools/scripts/release-readiness.sh before cutting a stable release\n'
