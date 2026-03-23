#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"
workspace_hub_dir="$repos_dir/workspace-hub"
workspace_name=$(basename "$workspace_root")

ok_count=0
warn_count=0
fail_count=0

core_missing=""
hub_missing=""
mixed_missing=""
wp_missing=""

usage() {
  cat <<EOF
Usage: $(basename "$0")

Run a non-destructive environment check for Codex Workspace.
EOF
}

append_csv() {
  var_name=$1
  item=$2
  eval "current_value=\${$var_name:-}"
  if [ -n "$current_value" ]; then
    eval "$var_name=\$current_value', '\$item"
  else
    eval "$var_name=\$item"
  fi
}

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-22s %s\n' "$level" "$label" "$detail"
}

mark_ok() {
  ok_count=$((ok_count + 1))
  print_status "[ok]" "$1" "$2"
}

mark_warn() {
  warn_count=$((warn_count + 1))
  print_status "[warn]" "$1" "$2"
}

mark_fail() {
  fail_count=$((fail_count + 1))
  print_status "[fail]" "$1" "$2"
}

find_cmd() {
  cmd_name=$1
  if command -v "$cmd_name" >/dev/null 2>&1; then
    command -v "$cmd_name"
    return 0
  fi
  return 1
}

tool_version() {
  cmd_name=$1
  shift
  if command -v "$cmd_name" >/dev/null 2>&1; then
    "$cmd_name" "$@" 2>/dev/null | sed -n '1p'
  fi
}

check_cmd() {
  label=$1
  cmd_name=$2
  required=$3
  missing_bucket=$4

  if cmd_path=$(find_cmd "$cmd_name"); then
    version=$(tool_version "$cmd_name" --version || true)
    if [ -n "$version" ]; then
      mark_ok "$label" "$cmd_path ($version)"
    else
      mark_ok "$label" "$cmd_path"
    fi
    return 0
  fi

  if [ "$required" = "required" ]; then
    mark_fail "$label" "missing"
  else
    mark_warn "$label" "missing"
  fi

  if [ -n "$missing_bucket" ]; then
    append_csv "$missing_bucket" "$cmd_name"
  fi
  return 0
}

check_fd() {
  if fd_path=$(find_cmd fd); then
    version=$(tool_version fd --version || true)
    mark_ok "fd" "$fd_path${version:+ ($version)}"
    return 0
  fi

  if fd_path=$(find_cmd fdfind); then
    version=$(tool_version fdfind --version || true)
    mark_ok "fd" "$fd_path${version:+ ($version)}"
    return 0
  fi

  mark_warn "fd" "missing"
  append_csv core_missing "fd"
  return 0
}

check_app_paths() {
  label=$1
  required=$2
  missing_bucket=$3
  shift 3

  for app_path in "$@"; do
    if [ -e "$app_path" ]; then
      mark_ok "$label" "$app_path"
      return 0
    fi
  done

  if [ "$required" = "required" ]; then
    mark_fail "$label" "not found in common macOS app locations"
  else
    mark_warn "$label" "not found in common macOS app locations"
  fi

  if [ -n "$missing_bucket" ]; then
    append_csv "$missing_bucket" "$label"
  fi
  return 0
}

count_skill_files_by_name() {
  search_root=$1

  if [ ! -d "$search_root" ]; then
    printf '0\n'
    return 0
  fi

  find "$search_root" \
    \( -path '*/node_modules' -o -path '*/.git' \) -prune -o \
    -type f -name SKILL.md -print 2>/dev/null | wc -l | awk '{print $1}'
}

count_skill_files_by_path() {
  search_root=$1
  search_pattern=$2

  if [ ! -d "$search_root" ]; then
    printf '0\n'
    return 0
  fi

  find "$search_root" \
    \( -path '*/node_modules' -o -path '*/.git' \) -prune -o \
    -type f -path "$search_pattern" -print 2>/dev/null | wc -l | awk '{print $1}'
}

profile_status() {
  missing=$1
  if [ -n "$missing" ]; then
    printf 'needs %s' "$missing"
  else
    printf 'ready'
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
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

printf 'Codex Workspace doctor\n'
printf 'Workspace: %s\n\n' "$workspace_root"

printf 'Workspace layout\n'
if [ "$workspace_name" = "Codex Workspace" ]; then
  mark_ok "root folder" "$workspace_name"
else
  mark_warn "root folder" "expected 'Codex Workspace', got '$workspace_name'"
fi

for required_dir in docs repos tools cache shared; do
  if [ -d "$workspace_root/$required_dir" ]; then
    mark_ok "$required_dir/" "present"
  else
    mark_fail "$required_dir/" "missing"
  fi
done

if [ -f "$workspace_root/AGENTS.md" ]; then
  mark_ok "AGENTS.md" "present"
else
  mark_fail "AGENTS.md" "missing"
fi

printf '\nCore tools\n'
check_cmd "git" git required core_missing
check_cmd "rg" rg recommended core_missing
check_cmd "jq" jq recommended core_missing
check_fd
check_cmd "tree" tree recommended core_missing

printf '\nWorkspace Hub\n'
if [ -d "$workspace_hub_dir" ]; then
  mark_ok "repo" "$workspace_hub_dir"
else
  mark_fail "repo" "missing $workspace_hub_dir"
  append_csv hub_missing "repos/workspace-hub"
fi

check_cmd "node" node required hub_missing
check_cmd "pnpm" pnpm required hub_missing

if [ -f "$workspace_hub_dir/pnpm-lock.yaml" ]; then
  mark_ok "pnpm-lock.yaml" "present"
else
  mark_warn "pnpm-lock.yaml" "missing"
fi

if [ -d "$workspace_hub_dir/node_modules" ]; then
  mark_ok "dependencies" "installed"
else
  mark_warn "dependencies" "missing, run 'cd repos/workspace-hub && pnpm install'"
fi

if [ -n "${WORKSPACE_HUB_SCREENSHOT_BROWSER:-}" ]; then
  mark_ok "screenshot browser" "$WORKSPACE_HUB_SCREENSHOT_BROWSER"
else
  check_app_paths \
    "screenshot browser" \
    recommended \
    "" \
    "/Applications/Google Chrome.app" \
    "$HOME/Applications/Google Chrome.app"
fi

printf '\nMixed-stack tooling\n'
check_cmd "python3" python3 recommended mixed_missing
if command -v pip3 >/dev/null 2>&1; then
  pip3_path=$(command -v pip3)
  pip3_version=$(tool_version pip3 --version || true)
  mark_ok "pip3" "$pip3_path${pip3_version:+ ($pip3_version)}"
elif command -v pip >/dev/null 2>&1; then
  pip_path=$(command -v pip)
  pip_version=$(tool_version pip --version || true)
  mark_ok "pip" "$pip_path${pip_version:+ ($pip_version)}"
else
  mark_warn "pip" "missing"
  append_csv mixed_missing "pip"
fi
check_cmd "uv" uv recommended ""
check_cmd "composer" composer recommended mixed_missing
check_cmd "wp" wp recommended mixed_missing

printf '\nOptional local runtimes\n'
servbay_present=0
local_present=0

if [ -e "/Applications/ServBay.app" ] || [ -e "$HOME/Applications/ServBay.app" ]; then
  servbay_present=1
fi
if [ -e "/Applications/Local.app" ] || [ -e "$HOME/Applications/Local.app" ]; then
  local_present=1
fi

check_app_paths "ServBay" recommended wp_missing "/Applications/ServBay.app" "$HOME/Applications/ServBay.app"
check_app_paths "Local" recommended wp_missing "/Applications/Local.app" "$HOME/Applications/Local.app"

printf '\nAgent environment\n'
if [ -d "$workspace_root/.agents/skills" ]; then
  root_repo_skills=$(count_skill_files_by_name "$workspace_root/.agents/skills")
else
  root_repo_skills=0
fi
shared_skills=$(count_skill_files_by_name "$workspace_root/shared/skills")
repo_neutral_skills=$(count_skill_files_by_path "$repos_dir" "*/.workspace/skills/*/SKILL.md")
repo_codex_skills=$(count_skill_files_by_path "$repos_dir" "*/.agents/skills/*/SKILL.md")
user_skills=$(count_skill_files_by_name "$HOME/.agents/skills")

mark_ok "repo skills" "root .agents/skills: $root_repo_skills, repo .agents/skills: $repo_codex_skills"
mark_ok "shared skills" "shared/skills: $shared_skills, repo .workspace/skills: $repo_neutral_skills"

if [ "$root_repo_skills" -eq 0 ] && [ "$repo_codex_skills" -eq 0 ] && [ "$shared_skills" -eq 0 ] && [ "$repo_neutral_skills" -eq 0 ]; then
  mark_warn "tracked skills" "none found yet in this workspace"
else
  mark_ok "tracked skills" "tracked skill files detected"
fi

if [ -f "$HOME/.codex/config.toml" ]; then
  mark_ok "Codex config" "$HOME/.codex/config.toml"
else
  mark_warn "Codex config" "not found at ~/.codex/config.toml"
fi

if [ -d "$HOME/.agents/skills" ]; then
  mark_ok "user skills" "$HOME/.agents/skills ($user_skills skill files)"
else
  mark_warn "user skills" "not found at ~/.agents/skills"
fi

if command -v codex >/dev/null 2>&1; then
  codex_path=$(command -v codex)
  mark_ok "codex command" "$codex_path"
else
  mark_warn "codex command" "not found in PATH"
fi

printf '\nRecommended setup profiles\n'
core_status=$(profile_status "$core_missing")
hub_status=$(profile_status "$hub_missing")
mixed_status=$(profile_status "$mixed_missing")

if [ "$servbay_present" -eq 1 ] || [ "$local_present" -eq 1 ]; then
  wordpress_status="ready if you need WordPress support"
else
  wordpress_status="optional, install ServBay or Local only if you manage WordPress here"
fi

if [ "$root_repo_skills" -eq 0 ] && [ "$repo_codex_skills" -eq 0 ] && [ "$shared_skills" -eq 0 ] && [ "$repo_neutral_skills" -eq 0 ]; then
  agent_status="ready for AGENTS.md guidance, add skills only if you want extra Codex workflows"
else
  agent_status="ready"
fi

printf -- '- Core: %s\n' "$core_status"
printf -- '- Hub: %s\n' "$hub_status"
printf -- '- Mixed Stack: %s\n' "$mixed_status"
printf -- '- WordPress: %s\n' "$wordpress_status"
printf -- '- Agent Enhanced: %s\n' "$agent_status"
printf -- '- Experimental Local: keep local-only by default\n'

printf '\nSuggested next steps\n'
printf -- '- Read docs/08-first-run-and-updates.md\n'

if [ ! -d "$workspace_hub_dir/node_modules" ]; then
  printf -- '- Run: cd %s && pnpm install\n' "$workspace_hub_dir"
fi

printf -- '- Start Workspace Hub when ready: cd %s && pnpm dev\n' "$workspace_hub_dir"
printf -- '- Review tracked repo guidance in AGENTS.md before changing repo structure or runtime rules\n'
printf -- '- Use tools/scripts/sync-codex-skills.sh only after you have tracked skill sources to sync\n'
printf -- '- Install extra upstream Codex skills selectively with $skill-installer, not by vendoring full catalogs\n'
printf -- '- Use tools/scripts/update-all.sh only when you want to fast-forward clean sibling repos under repos/\n'

printf '\nSummary: %s ok, %s warnings, %s failures\n' "$ok_count" "$warn_count" "$fail_count"
