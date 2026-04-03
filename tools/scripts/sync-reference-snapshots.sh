#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
ref_root="$workspace_root/tools/ref"
manifest_path="$workspace_root/tools/manifests/reference-sources.json"
run_mode="dry-run"
list_only="false"
requested_ids=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--manifest path] [--run] [--list] [source-id ...]

Refresh ignored upstream reference snapshots under tools/ref/.

Default behavior is a dry run. Use --run to apply changes.

Examples:
  $0 --list
  $0 openai-skills
  $0 --run openai-codex
  $0 --run oh-my-codex oh-my-openagent
EOF
}

append_requested_id() {
  requested_id=$1
  if [ -n "$requested_ids" ]; then
    requested_ids=$(printf '%s\n%s' "$requested_ids" "$requested_id")
  else
    requested_ids=$requested_id
  fi
}

require_manifest_support() {
  if [ ! -f "$manifest_path" ]; then
    printf 'Manifest not found: %s\n' "$manifest_path" >&2
    exit 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    printf 'jq is required.\n' >&2
    exit 1
  fi

  if ! jq -e '.sources | type == "array"' "$manifest_path" >/dev/null 2>&1; then
    printf 'Invalid manifest: %s\n' "$manifest_path" >&2
    exit 1
  fi
}

require_sync_tools() {
  for tool_name in curl tar; do
    if ! command -v "$tool_name" >/dev/null 2>&1; then
      printf '%s is required for --run mode.\n' "$tool_name" >&2
      exit 1
    fi
  done
}

source_exists() {
  source_id=$1
  jq -e --arg id "$source_id" '.sources[]? | select(.id == $id)' "$manifest_path" >/dev/null 2>&1
}

emit_source_json() {
  require_manifest_support

  if [ -z "$requested_ids" ]; then
    jq -c '.sources[]' "$manifest_path"
    return 0
  fi

  while IFS= read -r requested_id; do
    [ -n "$requested_id" ] || continue

    if ! source_exists "$requested_id"; then
      printf 'Unknown reference source: %s\n' "$requested_id" >&2
      exit 1
    fi

    jq -c --arg id "$requested_id" '.sources[] | select(.id == $id)' "$manifest_path"
  done <<EOF
$requested_ids
EOF
}

print_source_summary() {
  source_json=$1

  printf '%s\t%s\t%s\t%s\n' \
    "$(printf '%s' "$source_json" | jq -r '.id')" \
    "$(printf '%s' "$source_json" | jq -r '.targetDir')" \
    "$(printf '%s' "$source_json" | jq -r '.recommendedUse')" \
    "$(printf '%s' "$source_json" | jq -r '.repoUrl')"
}

sync_source() {
  source_json=$1

  id=$(printf '%s' "$source_json" | jq -r '.id')
  archive_url=$(printf '%s' "$source_json" | jq -r '.archiveUrl')
  license_name=$(printf '%s' "$source_json" | jq -r '.license')
  notes=$(printf '%s' "$source_json" | jq -r '.notes')
  recommended_use=$(printf '%s' "$source_json" | jq -r '.recommendedUse')
  repo_url=$(printf '%s' "$source_json" | jq -r '.repoUrl')
  target_dir_name=$(printf '%s' "$source_json" | jq -r '.targetDir')
  target_path="$ref_root/$target_dir_name"

  case "$target_path" in
    "$ref_root"/*) ;;
    *)
      printf 'Refusing to sync outside %s: %s\n' "$ref_root" "$target_path" >&2
      exit 1
      ;;
  esac

  printf '[%s]\n' "$id"
  printf 'Repo: %s\n' "$repo_url"
  printf 'License: %s\n' "$license_name"
  printf 'Use: %s\n' "$recommended_use"
  printf 'Target: %s\n' "$target_path"
  printf 'Notes: %s\n' "$notes"

  if [ "$run_mode" = "dry-run" ]; then
    if [ -e "$target_path" ]; then
      printf 'Mode: dry run (replace)\n'
    else
      printf 'Mode: dry run (add)\n'
    fi
    printf 'Archive: %s\n' "$archive_url"
    return 0
  fi

  tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/codex-ref.XXXXXX")
  archive_path="$tmp_dir/source.tar.gz"
  extract_dir="$tmp_dir/extracted"
  stale_path=""

  cleanup() {
    rm -rf "$tmp_dir"
  }

  trap 'cleanup' EXIT INT TERM HUP

  mkdir -p "$extract_dir" "$ref_root"

  curl --fail --location --silent --show-error "$archive_url" -o "$archive_path"
  tar -xzf "$archive_path" -C "$extract_dir"

  extracted_root=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort | sed -n '1p')

  if [ -z "$extracted_root" ]; then
    printf 'Archive did not contain an extractable top-level directory: %s\n' "$archive_url" >&2
    exit 1
  fi

  if [ -e "$target_path" ]; then
    stale_path="$ref_root/.stale-${id}-$$"
    rm -rf "$stale_path"
    mv "$target_path" "$stale_path"
  fi

  mv "$extracted_root" "$target_path"

  printf 'Mode: apply\n'
  printf 'Synced: %s <- %s\n' "$target_path" "$archive_url"

  if [ -n "$stale_path" ]; then
    chmod -R u+w "$stale_path" 2>/dev/null || true
    chflags -R nouchg "$stale_path" 2>/dev/null || true
    if ! rm -rf "$stale_path"; then
      printf 'Warning: could not fully remove stale snapshot: %s\n' "$stale_path" >&2
    fi
  fi

  trap - EXIT INT TERM HUP
  cleanup
}

while [ $# -gt 0 ]; do
  case "$1" in
    --manifest)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      manifest_path=$1
      shift
      ;;
    --run)
      run_mode="run"
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
      append_requested_id "$1"
      shift
      ;;
  esac
done

if [ "$run_mode" = "run" ]; then
  require_sync_tools
fi

if [ "$list_only" = "true" ]; then
  source_rows=$(emit_source_json)

  if [ -z "$source_rows" ]; then
    printf 'No reference sources selected.\n' >&2
    exit 1
  fi

  printf '%s\n' "$source_rows" | while IFS= read -r source_json; do
    [ -n "$source_json" ] || continue
    print_source_summary "$source_json"
  done
  exit 0
fi

source_rows=$(emit_source_json)

if [ -z "$source_rows" ]; then
  printf 'No reference sources selected.\n' >&2
  exit 1
fi

printf '%s\n' "$source_rows" | while IFS= read -r source_json; do
  [ -n "$source_json" ] || continue
  sync_source "$source_json"
  printf '\n'
done
