#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-24s %s\n' "$level" "$label" "$detail"
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

  if cmd_path=$(find_cmd "$cmd_name"); then
    version=$(tool_version "$cmd_name" --version || true)
    print_status "[ok]" "$label" "$cmd_path${version:+ ($version)}"
  else
    print_status "[warn]" "$label" "missing"
  fi
}

count_matches() {
  search_root=$1
  shift
  find "$search_root" \
    \( -path '*/node_modules' -o -path '*/.git' \) -prune -o \
    "$@" -print 2>/dev/null | wc -l | awk '{print $1}'
}

printf 'Codex Workspace agent tooling doctor\n'
printf 'Workspace: %s\n\n' "$workspace_root"

printf 'Commands\n'
check_cmd "codex" codex
check_cmd "omx" omx
check_cmd "opencode" opencode
check_cmd "bun" bun
check_cmd "jq" jq

printf '\nUser config\n'
if [ -f "$HOME/.codex/config.toml" ]; then
  print_status "[ok]" "Codex config" "$HOME/.codex/config.toml"
else
  print_status "[warn]" "Codex config" "missing"
fi

if [ -d "$HOME/.codex/skills" ]; then
  user_codex_skill_count=$(count_matches "$HOME/.codex/skills" -type f -name SKILL.md)
  print_status "[ok]" "user .codex skills" "$HOME/.codex/skills ($user_codex_skill_count skill files)"
else
  print_status "[warn]" "user .codex skills" "missing"
fi

if [ -d "$HOME/.agents/skills" ]; then
  legacy_user_skill_count=$(count_matches "$HOME/.agents/skills" -type f -name SKILL.md)
  print_status "[ok]" "legacy .agents skills" "$HOME/.agents/skills ($legacy_user_skill_count skill files)"
fi

opencode_user_dir="$HOME/.config/opencode"
if [ -d "$opencode_user_dir" ]; then
  print_status "[ok]" "OpenCode dir" "$opencode_user_dir"
else
  print_status "[warn]" "OpenCode dir" "missing"
fi

printf '\nTracked workspace assets\n'
shared_skill_count=$(count_matches "$workspace_root/shared/skills" -type f -name SKILL.md)
print_status "[ok]" "shared skills" "$shared_skill_count skill files"

for template_dir in \
  "$workspace_root/tools/templates/agents-md" \
  "$workspace_root/tools/templates/codex" \
  "$workspace_root/tools/templates/opencode" \
  "$workspace_root/tools/templates/skills"
do
  if [ -d "$template_dir" ]; then
    print_status "[ok]" "$(basename "$template_dir") templates" "$template_dir"
  else
    print_status "[warn]" "$(basename "$template_dir") templates" "missing"
  fi
done

for script_path in \
  "$workspace_root/tools/scripts/init-agents-tree.sh" \
  "$workspace_root/tools/scripts/doctor-agent-tooling.sh" \
  "$workspace_root/tools/scripts/sync-reference-snapshots.sh"
do
  if [ -f "$script_path" ]; then
    print_status "[ok]" "$(basename "$script_path")" "$script_path"
  else
    print_status "[warn]" "$(basename "$script_path")" "missing"
  fi
done

printf '\nRepo surfaces\n'
repo_agents=$(count_matches "$repos_dir" -type f -name AGENTS.md)
repo_agent_skill_dirs=$(count_matches "$repos_dir" -type f -path '*/.agents/skills/*/SKILL.md')
repo_codex_skill_dirs=$(count_matches "$repos_dir" -type f -path '*/.codex/skills/*/SKILL.md')
repo_codex_configs=$(count_matches "$repos_dir" -type f -path '*/.codex/config.toml')
repo_agent_stacks=$(count_matches "$repos_dir" -type f -path '*/.workspace/agent-stack.json')
repo_opencode=$(count_matches "$repos_dir" -type f \( -path '*/.opencode/opencode.json' -o -path '*/.opencode/opencode.jsonc' \))
repo_openagent=$(count_matches "$repos_dir" -type f \( -path '*/.opencode/oh-my-openagent.json' -o -path '*/.opencode/oh-my-openagent.jsonc' -o -path '*/.opencode/oh-my-opencode.json' -o -path '*/.opencode/oh-my-opencode.jsonc' \))
repo_omx=$(count_matches "$repos_dir" -type d -path '*/.omx')

print_status "[ok]" "repo AGENTS.md" "$repo_agents"
print_status "[ok]" "repo .agents skills" "$repo_agent_skill_dirs"
print_status "[ok]" "repo .codex skills" "$repo_codex_skill_dirs"
print_status "[ok]" "repo .codex config" "$repo_codex_configs"
print_status "[ok]" "agent stack files" "$repo_agent_stacks"
print_status "[ok]" "OpenCode configs" "$repo_opencode"
print_status "[ok]" "openagent configs" "$repo_openagent"
print_status "[ok]" "OMX dirs" "$repo_omx"

printf '\nPolicy\n'
print_status "[ok]" "tools/ref" "temporary reviewed references for extracting base upgrades into tracked workspace code, docs, templates, and skills"
