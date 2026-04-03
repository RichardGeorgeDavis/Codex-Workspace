#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

if [ $# -eq 0 ]; then
  printf 'Usage: %s <command> [args...]\n' "$(basename "$0")" >&2
  exit 1
fi

export WORKSPACE_ROOT="$workspace_root"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$workspace_root/cache/playwright-browsers}"
export PLAYWRIGHT_SKIP_BROWSER_GC="${PLAYWRIGHT_SKIP_BROWSER_GC:-1}"

exec "$@"
