#!/bin/zsh

# Shared port reservation helpers for workspace-level local launchers.
# Keep hosts stable on 127.0.0.1 and coordinate port picks through cache/.

typeset -ga WORKSPACE_PORT_RESERVATION_FILES

_workspace_port_state_root() {
  if [[ -n "${WORKSPACE_PORT_STATE_ROOT:-}" ]]; then
    printf '%s\n' "$WORKSPACE_PORT_STATE_ROOT"
    return 0
  fi

  if [[ -n "${WORKSPACE_ROOT:-}" ]]; then
    printf '%s\n' "$WORKSPACE_ROOT/cache/runtime/ports"
    return 0
  fi

  printf '%s\n' "${TMPDIR:-/tmp}/codex-workspace-runtime-ports"
}

_workspace_port_reservations_dir() {
  printf '%s/reservations\n' "$(_workspace_port_state_root)"
}

_workspace_port_lock_dir() {
  printf '%s/allocator.lock\n' "$(_workspace_port_state_root)"
}

_workspace_port_reservation_file() {
  local port="$1"
  printf '%s/%s.pid\n' "$(_workspace_port_reservations_dir)" "$port"
}

workspace_port_release_lock() {
  local lock_dir
  lock_dir="$(_workspace_port_lock_dir)"
  rm -f "$lock_dir/pid" >/dev/null 2>&1 || true
  rmdir "$lock_dir" >/dev/null 2>&1 || true
}

workspace_port_acquire_lock() {
  local state_root reservations_dir lock_dir attempts lock_pid
  state_root="$(_workspace_port_state_root)"
  reservations_dir="$(_workspace_port_reservations_dir)"
  lock_dir="$(_workspace_port_lock_dir)"

  mkdir -p "$state_root" "$reservations_dir"

  attempts=0
  while ! mkdir "$lock_dir" 2>/dev/null; do
    if [[ -r "$lock_dir/pid" ]]; then
      lock_pid="$(<"$lock_dir/pid")"
      if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" >/dev/null 2>&1; then
        workspace_port_release_lock
        continue
      fi
    fi

    attempts=$((attempts + 1))
    if (( attempts > 200 )); then
      echo "Timed out waiting for the workspace port allocator lock." >&2
      return 1
    fi

    sleep 0.1
  done

  print -r -- "$$" > "$lock_dir/pid"
}

workspace_port_cleanup_stale_reservations() {
  setopt localoptions null_glob

  local reservations_dir reservation_file reservation_pid
  reservations_dir="$(_workspace_port_reservations_dir)"
  mkdir -p "$reservations_dir"

  for reservation_file in "$reservations_dir"/*.pid; do
    [[ -e "$reservation_file" ]] || continue

    reservation_pid=""
    if [[ -r "$reservation_file" ]]; then
      reservation_pid="$(<"$reservation_file")"
    fi

    if [[ -z "$reservation_pid" ]] || ! kill -0 "$reservation_pid" >/dev/null 2>&1; then
      rm -f "$reservation_file"
    fi
  done
}

workspace_port_is_unavailable() {
  local port="$1"
  local reservation_file

  reservation_file="$(_workspace_port_reservation_file "$port")"
  if [[ -e "$reservation_file" ]]; then
    return 0
  fi

  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

workspace_reserve_port() {
  local start_port="$1"
  local max_port="$2"
  local port reservation_file

  workspace_port_acquire_lock || return 1
  workspace_port_cleanup_stale_reservations

  port="$start_port"
  while (( port <= max_port )); do
    if ! workspace_port_is_unavailable "$port"; then
      reservation_file="$(_workspace_port_reservation_file "$port")"
      print -r -- "$$" > "$reservation_file"
      WORKSPACE_PORT_RESERVATION_FILES+=("$reservation_file")
      workspace_port_release_lock
      printf '%s\n' "$port"
      return 0
    fi

    port=$((port + 1))
  done

  workspace_port_release_lock
  return 1
}

workspace_reserve_port_pair() {
  local start_port="$1"
  local max_start_port="$2"
  local port first_file second_file

  workspace_port_acquire_lock || return 1
  workspace_port_cleanup_stale_reservations

  port="$start_port"
  while (( port <= max_start_port )); do
    if ! workspace_port_is_unavailable "$port" && ! workspace_port_is_unavailable "$((port + 1))"; then
      first_file="$(_workspace_port_reservation_file "$port")"
      second_file="$(_workspace_port_reservation_file "$((port + 1))")"
      print -r -- "$$" > "$first_file"
      print -r -- "$$" > "$second_file"
      WORKSPACE_PORT_RESERVATION_FILES+=("$first_file" "$second_file")
      workspace_port_release_lock
      printf '%s\n' "$port"
      return 0
    fi

    port=$((port + 1))
  done

  workspace_port_release_lock
  return 1
}

workspace_release_port_reservations() {
  local reservation_file

  for reservation_file in "${WORKSPACE_PORT_RESERVATION_FILES[@]}"; do
    rm -f "$reservation_file" >/dev/null 2>&1 || true
  done

  WORKSPACE_PORT_RESERVATION_FILES=()
}
