#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/mcp-env.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--profile profile]

Check the managed Codex Workspace MCP setup and the expected server set.
EOF
}

profile=""

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      profile=$1
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

if [ -z "$profile" ]; then
  profile=$(detect_managed_mcp_profile)
fi

if [ -z "$profile" ]; then
  profile="default-full"
fi

case "$profile" in
  default-full|safe-readonly|browser-debug|research|github-full)
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac

load_mcp_local_env

fail_count=0
warn_count=0

mark_ok() {
  print_mcp_status "[ok]" "$1" "$2"
}

mark_warn() {
  warn_count=$((warn_count + 1))
  print_mcp_status "[warn]" "$1" "$2"
}

mark_fail() {
  fail_count=$((fail_count + 1))
  print_mcp_status "[fail]" "$1" "$2"
}

require_cmd() {
  cmd_name=$1
  label=$2

  if command -v "$cmd_name" >/dev/null 2>&1; then
    mark_ok "$label" "$(command -v "$cmd_name")"
    return 0
  fi

  mark_fail "$label" "missing"
  return 1
}

check_no_machine_paths() {
  if command -v rg >/dev/null 2>&1; then
    if rg -n '/Users/|/Volumes/|C:\\\\|/home/' "$mcp_template_root" "$mcp_workspace_root/repos/workspace-hub/.workspace/mcp" >/dev/null 2>&1; then
      mark_fail "tracked paths" "machine-specific absolute path found in tracked MCP examples"
    else
      mark_ok "tracked paths" "no machine-specific absolute path found in tracked MCP examples"
    fi
    return 0
  fi

  if grep -R -n -E '/Users/|/Volumes/|C:\\\\|/home/' "$mcp_template_root" "$mcp_workspace_root/repos/workspace-hub/.workspace/mcp" >/dev/null 2>&1; then
    mark_fail "tracked paths" "machine-specific absolute path found in tracked MCP examples"
  else
    mark_ok "tracked paths" "no machine-specific absolute path found in tracked MCP examples"
  fi
}

profile_expected_servers() {
  case "$profile" in
    default-full)
      printf '%s\n' openaiDeveloperDocs context7 playwright chrome-devtools github
      ;;
    safe-readonly)
      printf '%s\n' openaiDeveloperDocs context7
      ;;
    browser-debug)
      printf '%s\n' playwright chrome-devtools
      ;;
    research)
      printf '%s\n' openaiDeveloperDocs context7
      ;;
    github-full)
      printf '%s\n' github
      ;;
  esac
}

server_json_path() {
  server_name=$1
  case "$server_name" in
    openaiDeveloperDocs)
      printf '%s\n' "$mcp_server_template_root/openai-developer-docs.example.json"
      ;;
    context7)
      printf '%s\n' "$mcp_server_template_root/context7.example.json"
      ;;
    playwright)
      printf '%s\n' "$mcp_server_template_root/playwright.example.json"
      ;;
    chrome-devtools)
      printf '%s\n' "$mcp_server_template_root/chrome-devtools.example.json"
      ;;
    github)
      printf '%s\n' "$mcp_server_template_root/github.example.json"
      ;;
  esac
}

printf 'Codex Workspace MCP health check\n'
printf 'Workspace: %s\n' "$mcp_workspace_root"
printf 'Profile: %s\n' "$profile"
printf 'Codex config: %s\n\n' "$mcp_codex_config_file"

require_cmd codex "codex"
require_cmd jq "jq"

if [ ! -f "$mcp_codex_config_file" ]; then
  mark_fail "Codex config" "missing $mcp_codex_config_file"
fi

if [ -f "$mcp_generated_overlay_file" ]; then
  mark_ok "local overlay" "$mcp_generated_overlay_file"
else
  mark_warn "local overlay" "missing $mcp_generated_overlay_file"
fi

if [ -f "$mcp_local_env_file" ]; then
  mark_ok "local env" "$mcp_local_env_file"
else
  mark_warn "local env" "missing $mcp_local_env_file"
fi

tracked_json_targets=$(find "$mcp_template_root" "$mcp_workspace_root/repos/workspace-hub/.workspace/mcp" -type f -name '*.json' 2>/dev/null | sort)
if [ -n "$tracked_json_targets" ]; then
  tracked_json_failures=""
  old_ifs=$IFS
  IFS='
'
  for json_file in $tracked_json_targets; do
    if jq empty "$json_file" >/dev/null 2>&1; then
      :
    else
      tracked_json_failures="$tracked_json_failures $json_file"
    fi
  done
  IFS=$old_ifs

  if [ -n "$tracked_json_failures" ]; then
    mark_fail "tracked JSON" "failed to parse:$tracked_json_failures"
  else
    mark_ok "tracked JSON" "all profile and server examples parse"
  fi
fi

check_no_machine_paths

server_list_json=$(codex mcp list --json)
mark_ok "codex mcp list" "returned JSON"

for expected_server in $(profile_expected_servers); do
  if printf '%s\n' "$server_list_json" | jq -e --arg name "$expected_server" '.[] | select(.name == $name)' >/dev/null 2>&1; then
    mark_ok "server $expected_server" "configured"
  else
    mark_fail "server $expected_server" "missing from codex mcp list"
  fi
done

if printf '%s\n' "$server_list_json" | jq -e '.[] | select(.name == "playwright")' >/dev/null 2>&1; then
  playwright_json=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "playwright")')
  playwright_command=$(printf '%s\n' "$playwright_json" | jq -r '.transport.command')
  if [ "$playwright_command" = "$mcp_playwright_wrapper" ]; then
    mark_ok "playwright command" "$playwright_command"
  else
    mark_warn "playwright command" "expected $mcp_playwright_wrapper, got $playwright_command"
  fi

  if [ "$(printf '%s\n' "$playwright_json" | jq -r '.transport.env.PLAYWRIGHT_BROWSERS_PATH // empty')" = "$mcp_playwright_cache_root" ]; then
    mark_ok "playwright cache" "$mcp_playwright_cache_root"
  else
    if "$mcp_playwright_wrapper" --doctor >/dev/null 2>&1; then
      mark_ok "playwright cache" "$mcp_playwright_cache_root (wrapper-managed)"
    else
      mark_fail "playwright cache" "wrapper doctor failed"
    fi
  fi
fi

if printf '%s\n' "$server_list_json" | jq -e '.[] | select(.name == "chrome-devtools")' >/dev/null 2>&1; then
  chrome_command=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "chrome-devtools") | .transport.command')
  if [ "$chrome_command" = "$mcp_chrome_wrapper" ]; then
    mark_ok "chrome command" "$chrome_command"
  else
    mark_warn "chrome command" "expected $mcp_chrome_wrapper, got $chrome_command"
  fi

  if "$mcp_chrome_wrapper" --doctor >/dev/null 2>&1; then
    mark_ok "chrome doctor" "wrapper resolved"
  else
    mark_fail "chrome doctor" "wrapper doctor failed"
  fi
fi

if printf '%s\n' "$server_list_json" | jq -e '.[] | select(.name == "openaiDeveloperDocs")' >/dev/null 2>&1; then
  openai_url=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "openaiDeveloperDocs") | .transport.url')
  if [ "$openai_url" = "https://developers.openai.com/mcp" ]; then
    mark_ok "OpenAI Docs" "$openai_url"
  else
    mark_warn "OpenAI Docs" "unexpected url $openai_url"
  fi
fi

if printf '%s\n' "$server_list_json" | jq -e '.[] | select(.name == "context7")' >/dev/null 2>&1; then
  context7_headers=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "context7") | .transport.env_http_headers.CONTEXT7_API_KEY // empty')
  if [ "$context7_headers" = "CONTEXT7_API_KEY" ]; then
    mark_ok "Context7 header" "CONTEXT7_API_KEY env mapping configured"
  else
    mark_warn "Context7 header" "env header mapping missing"
  fi

  if [ -n "${CONTEXT7_API_KEY:-}" ]; then
    mark_ok "Context7 auth" "CONTEXT7_API_KEY present in current shell"
  else
    mark_warn "Context7 auth" "optional CONTEXT7_API_KEY not set in current shell"
  fi
fi

if printf '%s\n' "$server_list_json" | jq -e '.[] | select(.name == "github")' >/dev/null 2>&1; then
  github_headers=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "github") | .transport.http_headers["X-MCP-Toolsets"] // empty')
  if [ "$github_headers" = "all" ]; then
    mark_ok "GitHub toolsets" "all"
  else
    mark_fail "GitHub toolsets" "expected all, got ${github_headers:-missing}"
  fi

  github_auth=$(printf '%s\n' "$server_list_json" | jq -r '.[] | select(.name == "github") | .auth_status')
  case "$github_auth" in
    bearer_token|logged_in)
      mark_ok "GitHub auth" "$github_auth"
      ;;
    not_logged_in)
      mark_warn "GitHub auth" "not logged in; set GITHUB_PAT or run codex mcp login github"
      ;;
    *)
      mark_warn "GitHub auth" "$github_auth"
      ;;
  esac
fi

for expected_server in $(profile_expected_servers); do
  server_json=$(server_json_path "$expected_server")
  if [ -f "$server_json" ]; then
    mark_ok "tracked server" "$server_json"
  else
    mark_fail "tracked server" "missing $server_json"
  fi
done

printf '\nSummary: %s warnings, %s failures\n' "$warn_count" "$fail_count"

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
