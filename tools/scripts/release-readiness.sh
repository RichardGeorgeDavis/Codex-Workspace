#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
workspace_hub_dir="$workspace_root/repos/workspace-hub"
workspace_hub_package="$workspace_hub_dir/package.json"
hub_pnpm_expected=""

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-24s %s\n' "$level" "$label" "$detail"
}

run_hub_pnpm() {
  if command -v corepack >/dev/null 2>&1 &&
    (cd "$workspace_hub_dir" && corepack pnpm --version >/dev/null 2>&1); then
    (cd "$workspace_hub_dir" && corepack pnpm "$@")
    return
  fi

  if [ -n "$hub_pnpm_expected" ] && command -v npx >/dev/null 2>&1; then
    (cd "$workspace_hub_dir" && npx --yes "pnpm@$hub_pnpm_expected" "$@")
    return
  fi

  (cd "$workspace_hub_dir" && pnpm "$@")
}

printf 'Codex Workspace release readiness\n'
printf 'Workspace: %s\n\n' "$workspace_root"

printf 'Baseline checks\n'
"$workspace_root/tools/scripts/doctor-workspace.sh"
printf '\n'
"$workspace_root/tools/scripts/doctor-agent-tooling.sh"

printf '\nWorkspace Hub verification\n'
if [ ! -d "$workspace_hub_dir/node_modules" ]; then
  print_status "[fail]" "dependencies" "repos/workspace-hub/node_modules is missing"
  exit 1
fi

hub_package_manager=$(node -e 'const pkg = require(process.argv[1]); process.stdout.write(pkg.packageManager || "pnpm");' "$workspace_hub_package")
case "$hub_package_manager" in
  pnpm@*)
    hub_pnpm_expected=${hub_package_manager#pnpm@}
    ;;
  pnpm)
    ;;
  *)
    print_status "[fail]" "packageManager" "unsupported Workspace Hub package manager: $hub_package_manager"
    exit 1
    ;;
esac

hub_pnpm_version=$(run_hub_pnpm --version)
if [ -n "$hub_pnpm_expected" ] && [ "$hub_pnpm_version" != "$hub_pnpm_expected" ]; then
  print_status "[fail]" "pnpm" "expected $hub_pnpm_expected from packageManager, got $hub_pnpm_version"
  exit 1
fi
print_status "[ok]" "pnpm" "using $hub_pnpm_version for repos/workspace-hub"

run_hub_pnpm test
print_status "[ok]" "pnpm test" "passed"
run_hub_pnpm lint
print_status "[ok]" "pnpm lint" "passed"
run_hub_pnpm build
print_status "[ok]" "pnpm build" "passed"

printf '\nNon-destructive smoke\n'
"$workspace_root/tools/scripts/sync-codex-skills.sh" "$workspace_hub_dir"
print_status "[ok]" "skill sync dry run" "completed for repos/workspace-hub"

printf '\nPlaceholder surfaces\n'
if rg -n '\[TODO:' "$workspace_root/plugins/workspace-quality-gate/.codex-plugin/plugin.json" >/dev/null 2>&1; then
  print_status "[fail]" "plugin manifest" "placeholder TODO fields remain in workspace-quality-gate"
  exit 1
fi
print_status "[ok]" "plugin manifest" "no TODO placeholders detected"

printf '\nManual stable checks\n'
printf -- '- Review docs/10-release-readiness.md\n'
printf -- '- Confirm at least one direct-run repo and one external-run repo behave correctly in Workspace Hub\n'
printf -- '- Confirm agent preset scaffolding only adds missing files and preserves existing repo content\n'
