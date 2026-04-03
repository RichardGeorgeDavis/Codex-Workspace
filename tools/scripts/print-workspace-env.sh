#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

quote_sh() {
  printf "%s" "$1" | sed "s/'/'\\\\''/g; 1s/^/'/; \$s/\$/'/"
}

printf 'export WORKSPACE_ROOT=%s\n' "$(quote_sh "$workspace_root")"
printf 'export PLAYWRIGHT_BROWSERS_PATH=%s\n' "$(quote_sh "$workspace_root/cache/playwright-browsers")"
printf 'export PLAYWRIGHT_SKIP_BROWSER_GC=%s\n' "$(quote_sh "1")"
