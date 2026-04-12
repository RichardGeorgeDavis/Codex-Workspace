#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_DIR="$WORKSPACE_ROOT/repos/current-builds/knowledge-palace"
URL="${KNOWLEDGE_PALACE_UI_URL:-http://127.0.0.1:8765}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Knowledge Palace repo not found:"
  echo "  $PROJECT_DIR"
  echo
  read '?Press Return to close this window...'
  exit 1
fi

cd "$PROJECT_DIR"

if ! python3 - <<'PY' >/dev/null 2>&1
import importlib
import sys

for module_name in ("yaml", "jsonschema"):
    importlib.import_module(module_name)
PY
then
  echo "Installing Knowledge Palace UI dependencies..."
  python3 -m pip install -e .
  echo
fi

echo "Starting Knowledge Palace UI"
echo "Project dir: $PROJECT_DIR"
echo "URL: $URL"
echo

python3 -m knowledge_palace.cli serve-ui &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

until curl -sSf "$URL/api/tree" >/dev/null 2>&1; do
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 1
done

open "$URL"
wait "$SERVER_PID"
