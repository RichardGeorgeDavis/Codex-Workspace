#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_DIR="$WORKSPACE_ROOT/repos/prototypes/meshinstance"
HOST="127.0.0.1"
START_PORT="${MESHINSTANCE_PORT:-4175}"
MAX_PORT="${MESHINSTANCE_MAX_PORT:-4299}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Project not found:"
  echo "  $PROJECT_DIR"
  echo
  read '?Press Return to close this window...'
  exit 1
fi

cd "$PROJECT_DIR"
source "$WORKSPACE_ROOT/tools/scripts/workspace-port-allocator.sh"

PORT="$(workspace_reserve_port "$START_PORT" "$MAX_PORT")" || {
  echo "No free port found between $START_PORT and $MAX_PORT."
  exit 1
}

URL="http://${HOST}:${PORT}/"

python3 -m http.server "$PORT" --bind "$HOST" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  workspace_release_port_reservations || true
}

trap cleanup EXIT INT TERM

until curl -sSf "$URL" >/dev/null 2>&1; do
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 1
done

open "$URL"
wait "$SERVER_PID"
