#!/usr/bin/env sh

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
workspace_operator_home="${CODEX_WORKSPACE_REAL_HOME:-${HOME:-}}"

sanitize_mempalace_user() {
  candidate=$1
  if [ -z "$candidate" ]; then
    candidate="default"
  fi

  printf '%s' "$candidate" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9._-' '-'
}

detect_mempalace_user() {
  if [ -n "${CODEX_WORKSPACE_USER:-}" ]; then
    printf '%s\n' "$(sanitize_mempalace_user "$CODEX_WORKSPACE_USER")"
    return 0
  fi

  if [ -n "${USER:-}" ]; then
    printf '%s\n' "$(sanitize_mempalace_user "$USER")"
    return 0
  fi

  if command -v id >/dev/null 2>&1; then
    detected_user=$(id -un 2>/dev/null || printf '')
    if [ -n "$detected_user" ]; then
      printf '%s\n' "$(sanitize_mempalace_user "$detected_user")"
      return 0
    fi
  fi

  printf 'default\n'
}

detect_mempalace_python() {
  for candidate in \
    "${MEMPALACE_PYTHON:-}" \
    "python3.13" \
    "python3.12" \
    "python3.11" \
    "python3.10" \
    "/usr/bin/python3" \
    "/Applications/ServBay/package/python/current/Python.framework/Versions/Current/bin/python3" \
    "python3"
  do
    [ -n "$candidate" ] || continue

    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  printf '\n'
}

mempalace_user=$(detect_mempalace_user)
mempalace_preferred_python=$(detect_mempalace_python)
mempalace_uv_python="${MEMPALACE_UV_PYTHON:-3.13}"
mempalace_repo="$workspace_root/tools/mempalace"
mempalace_repo_url="${MEMPALACE_REPO_URL:-https://github.com/milla-jovovich/mempalace.git}"
mempalace_shared_root="$workspace_root/shared/mempalace/$mempalace_user"
mempalace_home="$mempalace_shared_root/home"
mempalace_config_dir="$mempalace_home/.mempalace"
mempalace_exports_root="$mempalace_shared_root/exports"
mempalace_codex_exports_root="$mempalace_exports_root/codex"
mempalace_cache_root="$workspace_root/cache/mempalace/$mempalace_user"
mempalace_state_file="$mempalace_shared_root/service-state.json"
mempalace_python="$mempalace_repo/.venv/bin/python"
mempalace_pip="$mempalace_repo/.venv/bin/pip"
mempalace_docs="$workspace_root/docs/11-core-memory-and-reference-promotion.md"
mempalace_readme="$mempalace_repo/README.md"
mempalace_install_command="$workspace_root/tools/bin/workspace-memory install"
mempalace_runtime_command="$workspace_root/tools/bin/mempalace-start"
mempalace_sync_command="$workspace_root/tools/bin/mempalace-sync"

ensure_mempalace_dirs() {
  mkdir -p \
    "$mempalace_shared_root" \
    "$mempalace_home" \
    "$mempalace_config_dir" \
    "$mempalace_exports_root" \
    "$mempalace_codex_exports_root" \
    "$mempalace_cache_root"
}

mempalace_repo_exists() {
  [ -d "$mempalace_repo/.git" ] || git -C "$mempalace_repo" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

mempalace_venv_ready() {
  [ -x "$mempalace_python" ]
}

export_mempalace_runtime_env() {
  export CODEX_WORKSPACE_REAL_HOME="$workspace_operator_home"
  export HOME="$mempalace_home"
  export MEMPALACE_CACHE_DIR="$mempalace_cache_root"
  export ANONYMIZED_TELEMETRY="FALSE"
}

mempalace_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

record_mempalace_event() {
  event_kind=$1
  event_target=${2:-}
  now=$(mempalace_timestamp)

  ensure_mempalace_dirs

  if ! command -v jq >/dev/null 2>&1; then
    return 0
  fi

  temp_state=$(mktemp "$mempalace_cache_root/service-state.XXXXXX")

  if [ -f "$mempalace_state_file" ]; then
    jq \
      --arg now "$now" \
      --arg kind "$event_kind" \
      --arg target "$event_target" \
      --arg user "$mempalace_user" \
      --arg repo "$mempalace_repo" \
      --arg shared "$mempalace_shared_root" \
      --arg exports "$mempalace_exports_root" \
      --arg cache "$mempalace_cache_root" \
      '
      .serviceId = "mempalace"
      | .user = $user
      | .repoPath = $repo
      | .sharedRoot = $shared
      | .exportsRoot = $exports
      | .cacheRoot = $cache
      | .updatedAt = $now
      | .lastCommandAt = $now
      | .lastCommandKind = $kind
      | .lastCommandTarget = ($target | if length > 0 then . else null end)
      | if $kind == "install" then .lastInstallAt = $now else . end
      | if $kind == "init" then .lastInitAt = $now else . end
      | if $kind == "sync" then .lastSyncAt = $now else . end
      | if $kind == "mcp-server" then .lastRuntimeStartAt = $now else . end
      | if ($kind == "mine-docs" or $kind == "mine-repo" or $kind == "mine-convos") then .lastIngestAt = $now | .lastIngestTarget = ($target | if length > 0 then . else null end) else . end
      | if $kind == "export-codex" then .lastCodexExportAt = $now | .lastCodexExportTarget = ($target | if length > 0 then . else null end) else . end
      | if $kind == "search" then .lastSearchAt = $now | .lastSearchQuery = ($target | if length > 0 then . else null end) else . end
      | if $kind == "wake-up" then .lastWakeUpAt = $now else . end
      | if ($kind == "save-repo" or $kind == "save-workspace") then .lastSaveAt = $now | .lastSaveTarget = ($target | if length > 0 then . else null end) else . end
      ' \
      "$mempalace_state_file" >"$temp_state"
  else
    jq -n \
      --arg now "$now" \
      --arg kind "$event_kind" \
      --arg target "$event_target" \
      --arg user "$mempalace_user" \
      --arg repo "$mempalace_repo" \
      --arg shared "$mempalace_shared_root" \
      --arg exports "$mempalace_exports_root" \
      --arg cache "$mempalace_cache_root" \
      '
      {
        serviceId: "mempalace",
        user: $user,
        repoPath: $repo,
        sharedRoot: $shared,
        exportsRoot: $exports,
        cacheRoot: $cache,
        updatedAt: $now,
        lastCommandAt: $now,
        lastCommandKind: $kind,
        lastCommandTarget: ($target | if length > 0 then . else null end),
        lastInstallAt: (if $kind == "install" then $now else null end),
        lastInitAt: (if $kind == "init" then $now else null end),
        lastSyncAt: (if $kind == "sync" then $now else null end),
        lastRuntimeStartAt: (if $kind == "mcp-server" then $now else null end),
        lastIngestAt: (if ($kind == "mine-docs" or $kind == "mine-repo" or $kind == "mine-convos") then $now else null end),
        lastIngestTarget: (if ($kind == "mine-docs" or $kind == "mine-repo" or $kind == "mine-convos") and ($target | length > 0) then $target else null end),
        lastCodexExportAt: (if $kind == "export-codex" then $now else null end),
        lastCodexExportTarget: (if $kind == "export-codex" and ($target | length > 0) then $target else null end),
        lastSearchAt: (if $kind == "search" then $now else null end),
        lastSearchQuery: (if $kind == "search" and ($target | length > 0) then $target else null end),
        lastWakeUpAt: (if $kind == "wake-up" then $now else null end),
        lastSaveAt: (if ($kind == "save-repo" or $kind == "save-workspace") then $now else null end),
        lastSaveTarget: (if ($kind == "save-repo" or $kind == "save-workspace") and ($target | length > 0) then $target else null end)
      }
      ' >"$temp_state"
  fi

  mv "$temp_state" "$mempalace_state_file"
}
