#!/usr/bin/env sh
set -eu

fallback_workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

if [ -z "${HOME:-}" ] || [ "${HOME:-}" = "/" ]; then
  export HOME="$fallback_workspace_root/cache/playwright-mcp/home"
fi

. "$(dirname "$0")/mcp-env.sh"

ensure_mcp_local_dirs
load_mcp_local_env

export WORKSPACE_ROOT="${WORKSPACE_ROOT:-$mcp_workspace_root}"
export npm_config_cache="${npm_config_cache:-$mcp_npm_cache_root}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$mcp_cache_root}"

if [ "${1:-}" = "--doctor" ]; then
  if ! command -v npx >/dev/null 2>&1; then
    print_mcp_status "[fail]" "npx" "missing"
    exit 1
  fi

  mkdir -p "$HOME" "$npm_config_cache"
  print_mcp_status "[ok]" "workspace root" "$WORKSPACE_ROOT"
  print_mcp_status "[ok]" "home" "$HOME"
  print_mcp_status "[ok]" "npm cache" "$npm_config_cache"
  print_mcp_status "[ok]" "npx" "$(command -v npx)"
  print_mcp_status "[ok]" "server package" "chrome-devtools-mcp@latest"
  exit 0
fi

mkdir -p "$HOME" "$npm_config_cache"
exec npx -y chrome-devtools-mcp@latest "$@"
