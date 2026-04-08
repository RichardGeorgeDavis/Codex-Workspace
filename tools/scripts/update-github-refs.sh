#!/usr/bin/env sh
set -eu

workspace_root=${WORKSPACE_CAPABILITIES_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)}
capability_script="$workspace_root/tools/scripts/manage-workspace-capabilities.sh"
run_mode=""
list_only="false"
requested_ids=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] [--list] [capability-id ...]

Compatibility wrapper for capability updates.

- --list delegates to manage-workspace-capabilities.sh list
- update behavior delegates to manage-workspace-capabilities.sh update

Default behavior is a dry run. Use --run to apply changes.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="--run"
      shift
      ;;
    --list)
      list_only="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      requested_ids="$requested_ids $1"
      shift
      ;;
  esac
done

if [ ! -x "$capability_script" ]; then
  printf 'Missing capability manager: %s\n' "$capability_script" >&2
  exit 1
fi

if [ "$list_only" = "true" ]; then
  # shellcheck disable=SC2086
  exec "$capability_script" list $requested_ids
fi

# shellcheck disable=SC2086
exec "$capability_script" update $run_mode $requested_ids
