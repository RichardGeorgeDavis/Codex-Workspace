#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"
HUB_DIR="$WORKSPACE_ROOT/repos/workspace-hub"

if [[ ! -d "$HUB_DIR" ]]; then
  echo "Workspace Hub repo not found at:"
  echo "  $HUB_DIR"
  echo
  read '?Press Return to close this window...'
  exit 1
fi

typeset -a pnpm_cmd

if command -v pnpm >/dev/null 2>&1; then
  pnpm_cmd=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  pnpm_cmd=(corepack pnpm)
else
  echo "pnpm is not available, and corepack is not installed."
  echo "Install Node.js with Corepack support, or install pnpm globally."
  echo
  read '?Press Return to close this window...'
  exit 1
fi

export WORKSPACE_HUB_WORKSPACE_ROOT="$WORKSPACE_ROOT"
source "$WORKSPACE_ROOT/tools/scripts/workspace-port-allocator.sh"

cd "$HUB_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing Workspace Hub dependencies..."
  "${pnpm_cmd[@]}" install
  echo
fi

START_WEB_PORT="${WORKSPACE_HUB_START_WEB_PORT:-4100}"
MAX_WEB_PORT="${WORKSPACE_HUB_MAX_WEB_PORT:-4198}"
WEB_PORT="$(workspace_reserve_port_pair "$START_WEB_PORT" "$MAX_WEB_PORT")" || {
  echo "No free Workspace Hub port pair found between $START_WEB_PORT and $MAX_WEB_PORT."
  exit 1
}
API_PORT=$((WEB_PORT + 1))
WEB_URL="http://127.0.0.1:${WEB_PORT}"
API_URL="http://127.0.0.1:${API_PORT}/api/health"

echo "Starting Workspace Hub"
echo "Workspace root: $WORKSPACE_ROOT"
echo "Hub dir: $HUB_DIR"
echo "Web: $WEB_URL"
echo "API: $API_URL"
echo

api_pid=""
web_pid=""

cleanup() {
  if [[ -n "${web_pid:-}" ]]; then
    kill "$web_pid" 2>/dev/null || true
  fi
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" 2>/dev/null || true
  fi
  workspace_release_port_reservations || true
}

trap cleanup EXIT INT TERM

WORKSPACE_HUB_API_PORT="$API_PORT" "${pnpm_cmd[@]}" dev:api &
api_pid=$!

WORKSPACE_HUB_API_PORT="$API_PORT" "${pnpm_cmd[@]}" dev:web --host 127.0.0.1 --port "$WEB_PORT" --strictPort &
web_pid=$!

opened_browser=0

for _ in {1..60}; do
  if curl -fsS "$WEB_URL" >/dev/null 2>&1; then
    open "$WEB_URL"
    opened_browser=1
    break
  fi

  if ! kill -0 "$web_pid" >/dev/null 2>&1; then
    break
  fi

  if ! kill -0 "$api_pid" >/dev/null 2>&1; then
    break
  fi

  sleep 1
done

if (( ! opened_browser )); then
  echo "Workspace Hub did not answer on $WEB_URL before the timeout."
  echo "The dev process is still attached below if it is still starting."
  echo
fi

status=0

if ! kill -0 "$web_pid" >/dev/null 2>&1; then
  if wait "$web_pid"; then
    web_status=0
  else
    web_status=$?
  fi
  kill "$api_pid" 2>/dev/null || true
  wait "$api_pid" >/dev/null 2>&1 || true
  status="$web_status"
elif ! kill -0 "$api_pid" >/dev/null 2>&1; then
  if wait "$api_pid"; then
    api_status=0
  else
    api_status=$?
  fi
  kill "$web_pid" 2>/dev/null || true
  wait "$web_pid" >/dev/null 2>&1 || true
  status="$api_status"
else
  if wait "$web_pid"; then
    web_status=0
  else
    web_status=$?
  fi
  if wait "$api_pid"; then
    api_status=0
  else
    api_status=$?
  fi
  if [[ "$web_status" -ne 0 ]]; then
    status="$web_status"
  else
    status="$api_status"
  fi
fi

echo
echo "Workspace Hub exited with status $status."
read '?Press Return to close this window...'
exit $status
