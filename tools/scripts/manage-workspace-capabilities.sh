#!/usr/bin/env sh
set -eu

workspace_root=${WORKSPACE_CAPABILITIES_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)}
manifest_path=${WORKSPACE_CAPABILITIES_MANIFEST:-$workspace_root/tools/manifests/workspace-capabilities.json}
state_path=${WORKSPACE_CAPABILITIES_STATE_PATH:-$workspace_root/shared/workspace-capabilities/state.json}
snapshot_sync_script="$workspace_root/tools/scripts/sync-reference-snapshots.sh"
run_mode="dry-run"
command_name=""
requested_ids=""

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [--run] [capability-id ...]

Commands:
  list       Show capability classification, enabled state, install state, and target path.
  install    Install default-enabled capabilities, or install the selected ids.
  update     Update enabled capabilities, or update the selected ids.
  enable     Enable one or more capabilities for default update and Hub action flows.
  disable    Disable one or more capabilities for default update and Hub action flows.
  uninstall  Remove the selected managed checkout and disposable cache paths.

Default behavior is a dry run. Use --run to apply changes.
EOF
}

die() {
  printf '%s\n' "$1" >&2
  exit 1
}

append_requested_id() {
  requested_id=$1
  if [ -n "$requested_ids" ]; then
    requested_ids=$(printf '%s\n%s' "$requested_ids" "$requested_id")
  else
    requested_ids=$requested_id
  fi
}

require_manifest() {
  if [ ! -f "$manifest_path" ]; then
    printf 'Capability manifest not found: %s\n' "$manifest_path" >&2
    exit 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    printf 'jq is required.\n' >&2
    exit 1
  fi

  if ! jq -e '.capabilities | type == "array"' "$manifest_path" >/dev/null 2>&1; then
    printf 'Invalid capability manifest: %s\n' "$manifest_path" >&2
    exit 1
  fi
}

ensure_state_dir() {
  mkdir -p "$(dirname "$state_path")"
}

ensure_state_file() {
  ensure_state_dir

  if [ -f "$state_path" ]; then
    return 0
  fi

  printf '{\n  "version": 1,\n  "capabilities": {}\n}\n' >"$state_path"
}

file_exists() {
  target_path=$1
  [ -e "$target_path" ]
}

normalize_workspace_relative_path() {
  target_path=$1
  label=$2

  if [ -z "$target_path" ] || [ "$target_path" = "null" ]; then
    die "$label is required."
  fi

  case "$target_path" in
    /*)
      die "$label must stay inside the workspace root."
      ;;
  esac

  normalized_path=""
  old_ifs=$IFS
  IFS='/'
  set -f
  # shellcheck disable=SC2086
  set -- $target_path
  set +f
  IFS=$old_ifs

  for segment in "$@"; do
    case "$segment" in
      ''|.)
        continue
        ;;
      ..)
        case "$normalized_path" in
          '')
            die "$label must stay inside the workspace root."
            ;;
          */*)
            normalized_path=${normalized_path%/*}
            ;;
          *)
            normalized_path=""
            ;;
        esac
        ;;
      *)
        if [ -n "$normalized_path" ]; then
          normalized_path=$normalized_path/$segment
        else
          normalized_path=$segment
        fi
        ;;
    esac
  done

  if [ -z "$normalized_path" ]; then
    die "$label must stay inside the workspace root."
  fi

  printf '%s\n' "$normalized_path"
}

resolve_workspace_relative_path() {
  target_path=$1
  label=$2
  normalized_path=$(normalize_workspace_relative_path "$target_path" "$label")
  printf '%s/%s\n' "$workspace_root" "$normalized_path"
}

require_tool() {
  tool_name=$1
  if ! command -v "$tool_name" >/dev/null 2>&1; then
    printf '%s is required for this action.\n' "$tool_name" >&2
    exit 1
  fi
}

capability_exists() {
  capability_id=$1
  jq -e --arg id "$capability_id" '.capabilities[]? | select(.id == $id)' "$manifest_path" >/dev/null 2>&1
}

emit_capability_json() {
  require_manifest

  if [ -z "$requested_ids" ]; then
    jq -c '.capabilities[]' "$manifest_path"
    return 0
  fi

  while IFS= read -r capability_id; do
    [ -n "$capability_id" ] || continue

    if ! capability_exists "$capability_id"; then
      printf 'Unknown capability: %s\n' "$capability_id" >&2
      exit 1
    fi

    jq -c --arg id "$capability_id" '.capabilities[] | select(.id == $id)' "$manifest_path"
  done <<EOF
$requested_ids
EOF
}

capability_enabled() {
  capability_json=$1
  capability_id=$(printf '%s' "$capability_json" | jq -r '.id')
  default_enabled=$(printf '%s' "$capability_json" | jq -r '.enabledByDefault // false')

  if [ -f "$state_path" ]; then
    state_enabled=$(jq -r --arg id "$capability_id" '.capabilities[$id].enabled // empty' "$state_path" 2>/dev/null || true)
    if [ "$state_enabled" = "true" ] || [ "$state_enabled" = "false" ]; then
      printf '%s\n' "$state_enabled"
      return 0
    fi
  fi

  printf '%s\n' "$default_enabled"
}

capability_install_path() {
  capability_json=$1
  install_target=$(printf '%s' "$capability_json" | jq -r '.installTarget // empty')

  if [ -z "$install_target" ] || [ "$install_target" = "null" ]; then
    printf '\n'
    return 0
  fi

  resolve_workspace_relative_path "$install_target" "Capability installTarget"
}

capability_installed() {
  capability_json=$1
  install_path=$(capability_install_path "$capability_json")

  if [ -n "$install_path" ] && file_exists "$install_path"; then
    printf 'true\n'
  else
    printf 'false\n'
  fi
}

update_state_enabled() {
  capability_id=$1
  enabled_value=$2
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  ensure_state_file

  tmp_output=$(mktemp)
  jq \
    --arg id "$capability_id" \
    --arg updated_at "$timestamp" \
    --argjson enabled "$enabled_value" \
    '
      .version = 1
      | .capabilities = (.capabilities // {})
      | .capabilities[$id] = ((.capabilities[$id] // {}) + {
          enabled: $enabled,
          updatedAt: $updated_at
        })
    ' "$state_path" >"$tmp_output"
  mv "$tmp_output" "$state_path"
}

resolve_default_ids() {
  action_name=$1

  case "$action_name" in
    install)
      jq -r '.capabilities[] | select((.enabledByDefault // false) == true and (.installMethod // "git") != "manual") | .id' "$manifest_path"
      ;;
    update)
      jq -c '.capabilities[]' "$manifest_path" | while IFS= read -r capability_json; do
        [ -n "$capability_json" ] || continue
        enabled=$(capability_enabled "$capability_json")
        if [ "$enabled" = "true" ]; then
          printf '%s\n' "$(printf '%s' "$capability_json" | jq -r '.id')"
        fi
      done
      ;;
    *)
      ;;
  esac
}

update_repo_dir() {
  repo_dir=$1
  repo_name=$(basename "$repo_dir")

  if [ -n "$(git -C "$repo_dir" status --porcelain)" ]; then
    printf 'Skipping dirty working tree: %s\n' "$repo_name"
    return 0
  fi

  branch=$(git -C "$repo_dir" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  if [ -z "$branch" ]; then
    printf 'Skipping detached HEAD: %s\n' "$repo_name"
    return 0
  fi

  if ! git -C "$repo_dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    printf 'Skipping branch without upstream: %s (%s)\n' "$repo_name" "$branch"
    return 0
  fi

  printf 'Fetching remotes...\n'
  git -C "$repo_dir" fetch --all --prune
  printf 'Fast-forwarding %s...\n' "$branch"
  git -C "$repo_dir" pull --ff-only
}

run_manifest_command() {
  command_json=$1

  if [ -z "$command_json" ] || [ "$command_json" = "null" ]; then
    return 0
  fi

  if ! printf '%s' "$command_json" | jq -e '
    type == "array"
    and length > 0
    and all(.[]; type == "string" and length > 0)
  ' >/dev/null 2>&1; then
    die "Workspace capability commands must be non-empty JSON string arrays."
  fi

  args_file=$(mktemp)
  printf '%s' "$command_json" | jq -r '.[]' >"$args_file"

  set --
  command_target=""
  command_display=$(printf '%s' "$command_json" | jq -r 'map(@sh) | join(" ")')
  arg_index=0
  while IFS= read -r command_part || [ -n "$command_part" ]; do
    arg_index=$((arg_index + 1))
    if [ "$arg_index" -eq 1 ]; then
      command_target=$command_part
    else
      set -- "$@" "$command_part"
    fi
  done <"$args_file"
  rm -f "$args_file"

  if [ -z "$command_target" ]; then
    die "Workspace capability commands must not be empty."
  fi

  command_path=$(resolve_workspace_relative_path "$command_target" "Capability command target")

  if [ ! -x "$command_path" ]; then
    die "Capability command target is not executable: $command_path"
  fi

  if [ "$run_mode" = "run" ]; then
    (cd "$workspace_root" && "$command_path" "$@")
  else
    printf 'Plan: would run post-step: %s\n' "$command_display"
  fi
}

run_post_install_commands() {
  capability_json=$1
  printf '%s' "$capability_json" | jq -c '.postInstallCommands[]? // empty' | while IFS= read -r command_json; do
    [ -n "$command_json" ] || continue
    run_manifest_command "$command_json"
  done
}

print_capability_header() {
  capability_json=$1
  capability_id=$(printf '%s' "$capability_json" | jq -r '.id')
  classification=$(printf '%s' "$capability_json" | jq -r '.classification')
  install_target=$(printf '%s' "$capability_json" | jq -r '.installTarget // ""')

  printf '[%s]\n' "$capability_id"
  printf 'Class: %s\n' "$classification"
  if [ -n "$install_target" ]; then
    printf 'Target: %s/%s\n' "$workspace_root" "$install_target"
  fi
}

install_capability() {
  capability_json=$1
  capability_id=$(printf '%s' "$capability_json" | jq -r '.id')
  install_method=$(printf '%s' "$capability_json" | jq -r '.installMethod')
  install_path=$(capability_install_path "$capability_json")
  source_url=$(printf '%s' "$capability_json" | jq -r '.sourceUrl')
  install_command=$(printf '%s' "$capability_json" | jq -c '.installCommand // empty')

  print_capability_header "$capability_json"

  case "$install_method" in
    snapshot)
      if [ "$run_mode" = "run" ]; then
        "$snapshot_sync_script" --run "$capability_id"
      else
        "$snapshot_sync_script" "$capability_id"
      fi
      ;;
    git)
      require_tool git
      if [ -n "$install_path" ] && git -C "$install_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        printf 'Plan: repo already present; install action will refresh it.\n'
        if [ "$run_mode" = "run" ]; then
          update_repo_dir "$install_path"
        fi
      else
        if [ -z "$install_path" ]; then
          printf 'Capability has no install target.\n' >&2
          exit 1
        fi

        if [ "$run_mode" = "run" ]; then
          mkdir -p "$(dirname "$install_path")"
          printf 'Cloning %s -> %s\n' "$source_url" "$install_path"
          git clone "$source_url" "$install_path"
        else
          printf 'Plan: would clone %s -> %s\n' "$source_url" "$install_path"
        fi
      fi
      ;;
    *)
      printf 'Unsupported install method: %s\n' "$install_method" >&2
      exit 1
      ;;
  esac

  if [ -n "$install_command" ]; then
    run_manifest_command "$install_command"
  fi

  run_post_install_commands "$capability_json"
}

update_capability() {
  capability_json=$1
  install_method=$(printf '%s' "$capability_json" | jq -r '.installMethod')
  install_path=$(capability_install_path "$capability_json")
  sync_command=$(printf '%s' "$capability_json" | jq -c '.syncCommand // empty')
  capability_id=$(printf '%s' "$capability_json" | jq -r '.id')

  print_capability_header "$capability_json"

  if [ "$(capability_installed "$capability_json")" != "true" ]; then
    printf 'Skipping update because the capability is not installed.\n'
    return 0
  fi

  case "$install_method" in
    snapshot)
      if [ "$run_mode" = "run" ]; then
        "$snapshot_sync_script" --run "$capability_id"
      else
        "$snapshot_sync_script" "$capability_id"
      fi
      ;;
    git)
      require_tool git
      if [ -n "$sync_command" ]; then
        run_manifest_command "$sync_command"
      elif [ -n "$install_path" ]; then
        if [ "$run_mode" = "run" ]; then
          update_repo_dir "$install_path"
        else
          printf 'Plan: would fast-forward %s\n' "$install_path"
        fi
      fi
      ;;
    *)
      printf 'Unsupported install method: %s\n' "$install_method" >&2
      exit 1
      ;;
  esac

  run_post_install_commands "$capability_json"
}

uninstall_capability() {
  capability_json=$1
  install_path=$(capability_install_path "$capability_json")

  print_capability_header "$capability_json"

  if [ -n "$install_path" ]; then
    if [ "$run_mode" = "run" ]; then
      rm -rf "$install_path"
      printf 'Removed %s\n' "$install_path"
    else
      printf 'Plan: would remove %s\n' "$install_path"
    fi
  fi

  printf '%s' "$capability_json" | jq -r '.disposablePaths[]? // empty' | while IFS= read -r disposable_path; do
    [ -n "$disposable_path" ] || continue
    target_path=$(resolve_workspace_relative_path "$disposable_path" "Capability disposable path")
    if [ "$run_mode" = "run" ]; then
      rm -rf "$target_path"
      printf 'Removed disposable path %s\n' "$target_path"
    else
      printf 'Plan: would remove disposable path %s\n' "$target_path"
    fi
  done
}

list_capabilities() {
  emit_capability_json | while IFS= read -r capability_json; do
    [ -n "$capability_json" ] || continue
    capability_id=$(printf '%s' "$capability_json" | jq -r '.id')
    classification=$(printf '%s' "$capability_json" | jq -r '.classification')
    enabled=$(capability_enabled "$capability_json")
    installed=$(capability_installed "$capability_json")
    install_target=$(printf '%s' "$capability_json" | jq -r '.installTarget // "-"')
    printf '%s\t%s\tenabled=%s\tinstalled=%s\t%s\n' \
      "$capability_id" \
      "$classification" \
      "$enabled" \
      "$installed" \
      "$install_target"
  done
}

while [ $# -gt 0 ]; do
  case "$1" in
    list|install|update|enable|disable|uninstall)
      if [ -n "$command_name" ]; then
        usage >&2
        exit 1
      fi
      command_name=$1
      shift
      ;;
    --run)
      run_mode="run"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      append_requested_id "$1"
      shift
      ;;
  esac
done

if [ -z "$command_name" ]; then
  usage >&2
  exit 1
fi

require_manifest

if [ "$command_name" = "list" ]; then
  list_capabilities
  exit 0
fi

if [ -z "$requested_ids" ]; then
  default_ids=$(resolve_default_ids "$command_name")
  if [ -n "$default_ids" ]; then
    requested_ids=$default_ids
  fi
fi

if [ -z "$requested_ids" ]; then
  printf 'No capabilities selected for %s.\n' "$command_name" >&2
  exit 1
fi

if [ "$command_name" = "enable" ] || [ "$command_name" = "disable" ]; then
  while IFS= read -r capability_id; do
    [ -n "$capability_id" ] || continue
    if ! capability_exists "$capability_id"; then
      printf 'Unknown capability: %s\n' "$capability_id" >&2
      exit 1
    fi

    if [ "$run_mode" = "run" ]; then
      if [ "$command_name" = "enable" ]; then
        update_state_enabled "$capability_id" true
      else
        update_state_enabled "$capability_id" false
      fi
    fi

    printf '[%s] %s%s\n' \
      "$capability_id" \
      "$command_name" \
      "$( [ "$run_mode" = "run" ] && printf 'd' || printf ' (dry-run)' )"
  done <<EOF
$requested_ids
EOF
  exit 0
fi

emit_capability_json | while IFS= read -r capability_json; do
  [ -n "$capability_json" ] || continue

  case "$command_name" in
    install)
      install_capability "$capability_json"
      ;;
    update)
      update_capability "$capability_json"
      ;;
    uninstall)
      uninstall_capability "$capability_json"
      ;;
    *)
      printf 'Unsupported command: %s\n' "$command_name" >&2
      exit 1
      ;;
  esac
done
