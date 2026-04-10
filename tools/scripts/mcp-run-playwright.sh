#!/usr/bin/env sh
set -eu

fallback_workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

if [ -z "${HOME:-}" ] || [ "${HOME:-}" = "/" ]; then
  export HOME="$fallback_workspace_root/cache/playwright-mcp/home"
fi

# Keep the MCP runtime aligned with the workspace-wide cache and root contract.
. "$(dirname "$0")/mcp-env.sh"

ensure_mcp_local_dirs
load_mcp_local_env

export WORKSPACE_ROOT="${WORKSPACE_ROOT:-$mcp_workspace_root}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$mcp_playwright_cache_root}"
export PLAYWRIGHT_SKIP_BROWSER_GC="${PLAYWRIGHT_SKIP_BROWSER_GC:-1}"
export npm_config_cache="${npm_config_cache:-$mcp_npm_cache_root}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$mcp_cache_root}"

if [ "${1:-}" = "--doctor" ]; then
  if ! command -v npx >/dev/null 2>&1; then
    print_mcp_status "[fail]" "npx" "missing"
    exit 1
  fi

  mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  mkdir -p "$HOME" "$npm_config_cache" "$mcp_playwright_output_root"
  print_mcp_status "[ok]" "workspace root" "$WORKSPACE_ROOT"
  print_mcp_status "[ok]" "home" "$HOME"
  print_mcp_status "[ok]" "npm cache" "$npm_config_cache"
  print_mcp_status "[ok]" "browser cache" "$PLAYWRIGHT_BROWSERS_PATH"
  print_mcp_status "[ok]" "output dir" "$mcp_playwright_output_root"
  print_mcp_status "[ok]" "npx" "$(command -v npx)"
  print_mcp_status "[ok]" "server package" "@playwright/mcp@latest"
  print_mcp_status "[ok]" "server mode" "--isolated --output-dir $mcp_playwright_output_root"
  exit 0
fi

mkdir -p "$PLAYWRIGHT_BROWSERS_PATH" "$HOME" "$npm_config_cache" "$mcp_playwright_output_root"
exec npx -y @playwright/mcp@latest --isolated --output-dir "$mcp_playwright_output_root" "$@"
