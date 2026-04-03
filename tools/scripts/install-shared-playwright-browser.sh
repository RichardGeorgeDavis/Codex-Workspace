#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
browser=${1:-chromium}
run_mode="dry-run"
shared_browser_root="$workspace_root/cache/playwright-browsers"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] [browser]

Install a Playwright browser into the shared workspace cache path:
  $shared_browser_root

Default browser: chromium
Default mode: dry run

Examples:
  $0
  $0 --run
  $0 --run chromium
  $0 --run firefox
EOF
}

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-24s %s\n' "$level" "$label" "$detail"
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
      browser=$1
      shift
      ;;
  esac
done

printf 'Shared Playwright browser installer\n'
printf 'Workspace: %s\n' "$workspace_root"
printf 'Browser: %s\n' "$browser"
printf 'Cache path: %s\n' "$shared_browser_root"
printf 'Mode: %s\n\n' "$run_mode"

if ! command -v npx >/dev/null 2>&1; then
  print_status "[fail]" "npx" "missing"
  exit 1
fi

mkdir -p "$shared_browser_root"
print_status "[ok]" "cache root" "$shared_browser_root"

if [ "$run_mode" = "dry-run" ]; then
  print_status "[plan]" "install command" "PLAYWRIGHT_BROWSERS_PATH=$shared_browser_root PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install $browser"
  print_status "[plan]" "shell helper" "eval \"\$(tools/scripts/print-workspace-env.sh)\""
  print_status "[plan]" "repo usage" "tools/scripts/run-with-workspace-env.sh sh -lc 'npx playwright test'"
  exit 0
fi

PLAYWRIGHT_BROWSERS_PATH="$shared_browser_root" PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install "$browser"
print_status "[ok]" "browser" "installed $browser into $shared_browser_root"
