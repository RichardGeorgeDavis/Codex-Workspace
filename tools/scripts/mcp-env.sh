#!/usr/bin/env sh

mcp_workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
mcp_codex_home="${CODEX_HOME:-${HOME:-}/.codex}"
mcp_codex_config_file="$mcp_codex_home/config.toml"
mcp_local_root="$mcp_workspace_root/tools/local/agents/codex"
mcp_local_env_file="$mcp_local_root/mcp.env.local"
mcp_generated_overlay_file="$mcp_local_root/mcp.generated.toml"
mcp_generated_profile_file="$mcp_local_root/mcp-profile.txt"
mcp_template_root="$mcp_workspace_root/tools/templates/mcp"
mcp_profile_template_root="$mcp_template_root/profiles"
mcp_server_template_root="$mcp_template_root/servers"
mcp_cache_root="$mcp_workspace_root/cache"
mcp_npm_cache_root="$mcp_cache_root/npm"
mcp_playwright_cache_root="$mcp_workspace_root/cache/playwright-browsers"
mcp_playwright_runtime_root="$mcp_cache_root/playwright-mcp"
mcp_playwright_home_root="$mcp_playwright_runtime_root/home"
mcp_playwright_output_root="$mcp_playwright_runtime_root/output"
mcp_playwright_wrapper="$mcp_workspace_root/tools/scripts/mcp-run-playwright.sh"
mcp_chrome_wrapper="$mcp_workspace_root/tools/scripts/mcp-run-chrome-devtools.sh"
mcp_start_marker="# >>> CODEX WORKSPACE MCP START >>>"
mcp_end_marker="# <<< CODEX WORKSPACE MCP END <<<"

ensure_mcp_local_dirs() {
  mkdir -p \
    "$mcp_local_root" \
    "$mcp_codex_home" \
    "$mcp_cache_root" \
    "$mcp_npm_cache_root" \
    "$mcp_playwright_runtime_root" \
    "$mcp_playwright_home_root" \
    "$mcp_playwright_output_root"
}

load_mcp_local_env() {
  if [ -f "$mcp_local_env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$mcp_local_env_file"
    set +a
  fi
}

mcp_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

toml_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

print_mcp_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-24s %s\n' "$level" "$label" "$detail"
}

remove_managed_mcp_block() {
  target_file=$1

  if [ ! -f "$target_file" ]; then
    return 0
  fi

  awk -v start="$mcp_start_marker" -v end="$mcp_end_marker" '
    $0 == start { skip = 1; next }
    $0 == end { skip = 0; next }
    !skip { print }
  ' "$target_file"
}

detect_managed_mcp_profile() {
  if [ -f "$mcp_generated_profile_file" ]; then
    sed -n '1p' "$mcp_generated_profile_file"
    return 0
  fi

  if [ -f "$mcp_generated_overlay_file" ]; then
    sed -n 's/^# Profile: //p' "$mcp_generated_overlay_file" | sed -n '1p'
    return 0
  fi

  printf '\n'
}

ensure_mcp_local_env_file() {
  if [ -f "$mcp_local_env_file" ]; then
    return 0
  fi

  mkdir -p "$mcp_local_root"

  if [ -f "$mcp_template_root/env/codex-mcp.env.example" ]; then
    cp "$mcp_template_root/env/codex-mcp.env.example" "$mcp_local_env_file"
    return 0
  fi

  cat >"$mcp_local_env_file" <<'EOF'
# Local-only Codex Workspace MCP credentials and overrides.
#
# Export these in the shell that launches `codex`, or copy the values into a
# desktop-launch mechanism if you use the GUI app outside a shell.

# Optional. Context7 works without a key, but rate limits are higher with one.
# CONTEXT7_API_KEY=

# Optional when you prefer GitHub OAuth. If set, the managed GitHub MCP config
# will use this PAT for bearer auth.
# GITHUB_PAT=
EOF
}
