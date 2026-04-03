#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
workspace_hub_dir="$workspace_root/repos/workspace-hub"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--profile core|hub|mixed-stack|wordpress|agent-enhanced|workflow-state|spec-driven|ui-previews] [--list]

Non-destructive guided helper for Codex Workspace setup profiles.
EOF
}

print_status() {
  level=$1
  label=$2
  detail=$3
  printf '%-7s %-20s %s\n' "$level" "$label" "$detail"
}

find_cmd() {
  cmd_name=$1
  if command -v "$cmd_name" >/dev/null 2>&1; then
    command -v "$cmd_name"
    return 0
  fi
  return 1
}

check_cmd() {
  label=$1
  cmd_name=$2
  required=$3

  if cmd_path=$(find_cmd "$cmd_name"); then
    print_status "[ok]" "$label" "$cmd_path"
  else
    if [ "$required" = "required" ]; then
      print_status "[fail]" "$label" "missing"
    else
      print_status "[warn]" "$label" "missing"
    fi
  fi
}

check_fd() {
  if fd_path=$(find_cmd fd); then
    print_status "[ok]" "fd" "$fd_path"
  elif fd_path=$(find_cmd fdfind); then
    print_status "[ok]" "fd" "$fd_path"
  else
    print_status "[warn]" "fd" "missing"
  fi
}

check_app_path() {
  label=$1
  required=$2
  shift 2

  for app_path in "$@"; do
    if [ -e "$app_path" ]; then
      print_status "[ok]" "$label" "$app_path"
      return 0
    fi
  done

  if [ "$required" = "required" ]; then
    print_status "[fail]" "$label" "not found in common macOS app locations"
  else
    print_status "[warn]" "$label" "not found in common macOS app locations"
  fi
}

check_dir_path() {
  label=$1
  required=$2
  dir_path=$3

  if [ -d "$dir_path" ]; then
    print_status "[ok]" "$label" "$dir_path"
  else
    if [ "$required" = "required" ]; then
      print_status "[fail]" "$label" "missing $dir_path"
    else
      print_status "[warn]" "$label" "missing $dir_path"
    fi
  fi
}

count_tracked_skill_files() {
  find "$workspace_root" \
    \( -path '*/node_modules' -o -path '*/.git' \) -prune -o \
    -type f \( -path '*/.codex/skills/*/SKILL.md' -o -path '*/.agents/skills/*/SKILL.md' -o -path '*/shared/skills/*/SKILL.md' -o -path '*/.workspace/skills/*/SKILL.md' \) \
    -print 2>/dev/null | wc -l | awk '{print $1}'
}

list_profiles() {
  cat <<EOF
Available profiles:
- core
- hub
- mixed-stack
- wordpress
- agent-enhanced
- workflow-state
- spec-driven
- ui-previews
EOF
}

choose_profile_interactive() {
  printf 'Select a workspace profile:\n'
  printf '1. core\n'
  printf '2. hub\n'
  printf '3. mixed-stack\n'
  printf '4. wordpress\n'
  printf '5. agent-enhanced\n'
  printf '6. workflow-state\n'
  printf '7. spec-driven\n'
  printf '8. ui-previews\n'
  printf 'Choice: '
  IFS= read -r choice

  case "$choice" in
    1|core) printf 'core\n' ;;
    2|hub) printf 'hub\n' ;;
    3|mixed-stack|mixed) printf 'mixed-stack\n' ;;
    4|wordpress|wp) printf 'wordpress\n' ;;
    5|agent-enhanced|agent) printf 'agent-enhanced\n' ;;
    6|workflow-state|workflow|cognetivy) printf 'workflow-state\n' ;;
    7|spec-driven|spec) printf 'spec-driven\n' ;;
    8|ui-previews|previews|ui) printf 'ui-previews\n' ;;
    *)
      printf 'Unknown choice: %s\n' "$choice" >&2
      exit 1
      ;;
  esac
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
    --list)
      list_profiles
      exit 0
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
  if [ -t 0 ]; then
    profile=$(choose_profile_interactive)
  else
    usage >&2
    exit 1
  fi
fi

printf 'Codex Workspace setup profile\n'
printf 'Workspace: %s\n' "$workspace_root"
printf 'Profile: %s\n\n' "$profile"

case "$profile" in
  core)
    printf 'Purpose: workspace structure, docs, and helper scripts only.\n\n'
    printf 'Checks\n'
    check_cmd "git" git required
    check_cmd "rg" rg recommended
    check_cmd "jq" jq recommended
    check_fd
    check_cmd "tree" tree recommended
    printf '\nNext steps\n'
    printf -- '- Read docs/08-first-run-and-updates.md\n'
    printf -- '- Run tools/scripts/doctor-workspace.sh for the full workspace view\n'
    ;;
  hub)
    printf 'Purpose: run the local Workspace Hub dashboard.\n\n'
    printf 'Checks\n'
    check_cmd "node" node required
    check_cmd "pnpm" pnpm required
    if [ -d "$workspace_hub_dir" ]; then
      print_status "[ok]" "workspace-hub" "$workspace_hub_dir"
    else
      print_status "[fail]" "workspace-hub" "missing $workspace_hub_dir"
    fi
    if [ -d "$workspace_hub_dir/node_modules" ]; then
      print_status "[ok]" "dependencies" "installed"
    else
      print_status "[warn]" "dependencies" "missing"
    fi
    check_app_path "browser" recommended "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app"
    printf '\nNext steps\n'
    if [ ! -d "$workspace_hub_dir/node_modules" ]; then
      printf -- '- Run: cd %s && pnpm install\n' "$workspace_hub_dir"
    fi
    printf -- '- Run: cd %s && pnpm dev\n' "$workspace_hub_dir"
    printf -- '- Use tools/scripts/bootstrap-repo.sh for repo-native install detection in other repos\n'
    ;;
  mixed-stack)
    printf 'Purpose: support Python and PHP repos alongside Node repos.\n\n'
    printf 'Checks\n'
    check_cmd "python3" python3 recommended
    if find_cmd pip3 >/dev/null 2>&1; then
      print_status "[ok]" "pip3" "$(find_cmd pip3)"
    elif find_cmd pip >/dev/null 2>&1; then
      print_status "[ok]" "pip" "$(find_cmd pip)"
    else
      print_status "[warn]" "pip" "missing"
    fi
    check_cmd "uv" uv recommended
    check_cmd "composer" composer recommended
    check_cmd "wp" wp recommended
    printf '\nNext steps\n'
    printf -- '- Install only the tools your actual repos need\n'
    printf -- '- Keep repo installs inside each repo; only caches belong under cache/\n'
    printf -- '- Use tools/scripts/bootstrap-repo.sh to preview repo-native install commands\n'
    ;;
  wordpress)
    printf 'Purpose: support WordPress repos without making WordPress tooling mandatory for the whole workspace.\n\n'
    printf 'Checks\n'
    check_app_path "ServBay" recommended "/Applications/ServBay.app" "$HOME/Applications/ServBay.app"
    check_app_path "Local" recommended "/Applications/Local.app" "$HOME/Applications/Local.app"
    check_cmd "composer" composer recommended
    check_cmd "wp" wp recommended
    printf '\nNext steps\n'
    printf -- '- Prefer Local for WordPress projects already managed there\n'
    printf -- '- Use ServBay only when a shared local front door or proxy actually helps\n'
    printf -- '- Keep WordPress handling repo-native or external rather than forcing it through Workspace Hub\n'
    ;;
  agent-enhanced)
    printf 'Purpose: add Codex-visible skills, optional MCP examples, and other agent-facing improvements without turning the workspace into a full harness platform.\n\n'
    printf 'Checks\n'
    check_cmd "codex" codex recommended
    if [ -f "$HOME/.codex/config.toml" ]; then
      print_status "[ok]" "Codex config" "$HOME/.codex/config.toml"
    else
      print_status "[warn]" "Codex config" "not found at ~/.codex/config.toml"
    fi
    tracked_skills=$(count_tracked_skill_files)
    if [ "$tracked_skills" -gt 0 ]; then
      print_status "[ok]" "tracked skills" "$tracked_skills skill files detected"
    else
      print_status "[warn]" "tracked skills" "none detected yet"
    fi
    if [ -d "$workspace_root/tools/templates/skills" ]; then
      print_status "[ok]" "skill templates" "$workspace_root/tools/templates/skills"
    fi
    if [ -d "$workspace_root/tools/templates/mcp" ]; then
      print_status "[ok]" "MCP templates" "$workspace_root/tools/templates/mcp"
    fi
    printf '\nNext steps\n'
    printf -- '- Publish tracked repo skills under .codex/skills/ when a workflow becomes stable enough\n'
    printf -- '- Mirror into .agents/skills/ only when repo-local compatibility helps\n'
    printf -- '- Use tools/scripts/sync-codex-skills.sh only after you have tracked skill sources to sync\n'
    printf -- '- Keep MCP examples read-only by default and move mutating configs into local-only files when needed\n'
    printf -- '- Install upstream skills selectively with $skill-installer rather than vendoring full catalogs\n'
    ;;
  workflow-state)
    printf 'Purpose: add an optional local workflow-state layer for users who want repeatable runs, events, or collections without replacing tracked docs and specs as the source of truth.\n\n'
    printf 'Checks\n'
    check_cmd "node" node recommended
    check_cmd "npx" npx recommended
    check_cmd "cognetivy" cognetivy optional
    check_dir_path "workflow-state templates" recommended "$workspace_root/tools/templates/workflow-state"
    check_dir_path "artifact templates" recommended "$workspace_root/tools/templates/artifacts"
    printf '\nNext steps\n'
    printf -- '- Keep .cognetivy/ local-only by default unless a repo explicitly chooses to track it\n'
    printf -- '- Treat tracked docs, specs, manifests, and skills as canonical; treat workflow state as operational history\n'
    printf -- '- Use a workflow-state tool only as an optional local state layer for runs, events, and collections\n'
    printf -- '- Bridge durable findings back into docs/, openspec/, or repo skill folders once they stabilize\n'
    ;;
  spec-driven)
    printf 'Purpose: add a tracked spec and design review layer for larger changes without making it mandatory for everyday edits.\n\n'
    printf 'Checks\n'
    check_cmd "node" node recommended
    check_cmd "npm" npm recommended
    check_cmd "npx" npx recommended
    check_dir_path "OpenSpec templates" recommended "$workspace_root/tools/templates/openspec"
    check_dir_path "artifact templates" recommended "$workspace_root/tools/templates/artifacts"
    printf '\nNext steps\n'
    printf -- '- Use OpenSpec only for larger cross-session, cross-repo, or higher-risk changes\n'
    printf -- '- Keep tracked specs under openspec/ so intent stays with the code instead of inside one chat session\n'
    printf -- '- Start from tools/templates/openspec/ if you want a lightweight tracked spec layout without committing to a larger harness\n'
    printf -- '- Use tools/scripts/init-agent-job-bundle.sh for local cache/context job artifacts such as plan, summary, logs, and screenshots\n'
    ;;
  ui-previews)
    printf 'Purpose: add isolated component or page previews for frontend repos without turning preview tooling into a workspace-wide dependency.\n\n'
    printf 'Checks\n'
    check_cmd "node" node required
    check_cmd "pnpm" pnpm recommended
    check_cmd "npm" npm recommended
    check_app_path "browser" recommended "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app"
    check_dir_path "UI preview templates" recommended "$workspace_root/tools/templates/ui-previews"
    check_dir_path "Playwright cache" recommended "$workspace_root/cache/playwright-browsers"
    printf '\nNext steps\n'
    printf -- '- Prefer Ladle for fast React or Vite component previews with minimal setup\n'
    printf -- '- Use Storybook when richer docs, addon surface, or publishing matters more than minimal overhead\n'
    printf -- '- Keep preview tooling repo-local instead of adding a workspace-wide Storybook or Ladle dependency\n'
    printf -- '- Use Component Story Format so the same stories stay more portable between tools\n'
    printf -- '- Reuse the shared browser cache with: tools/scripts/install-shared-playwright-browser.sh --run chromium\n'
    printf -- '- For local smoke runs, prefer: tools/scripts/run-with-workspace-env.sh sh -lc '"'"'npx playwright test'"'"'\n'
    ;;
  *)
    printf 'Unknown profile: %s\n' "$profile" >&2
    list_profiles >&2
    exit 1
    ;;
esac

printf '\nThis script is advisory only. It does not install or modify anything.\n'
