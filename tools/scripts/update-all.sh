#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"
manifest_path="$workspace_root/tools/manifests/repo-groups.json"
requested_groups=""
list_groups="false"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--manifest path] [--group name] [--list-groups]

Fast-forward clean repos under repos/.
Use --group to target only paths listed in a repo-group manifest.
EOF
}

if ! command -v git >/dev/null 2>&1; then
  printf 'git is required.\n' >&2
  exit 1
fi

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
    --group)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      requested_groups=${requested_groups}${requested_groups:+'
'}$1
      shift
      ;;
    --list-groups)
      list_groups="true"
      shift
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

require_group_manifest_support() {
  if [ ! -f "$manifest_path" ]; then
    printf 'Manifest not found: %s\n' "$manifest_path" >&2
    exit 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    printf 'jq is required for repo-group manifest support.\n' >&2
    exit 1
  fi
}

update_repo_dir() {
  repo_dir=$1
  repo_name=$(basename "$repo_dir")
  printf '\n[%s]\n' "$repo_name"

  case "$repo_dir" in
    "$repos_dir/abilities"/*)
      printf 'Skipping managed ability repo. Use tools/scripts/manage-workspace-capabilities.sh update instead.\n'
      return 0
      ;;
  esac

  if [ -n "$(git -C "$repo_dir" status --porcelain)" ]; then
    printf 'Skipping dirty working tree.\n'
    return 0
  fi

  branch=$(git -C "$repo_dir" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  if [ -z "$branch" ]; then
    printf 'Skipping detached HEAD.\n'
    return 0
  fi

  if ! git -C "$repo_dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    printf 'Skipping branch without upstream: %s\n' "$branch"
    return 0
  fi

  printf 'Fetching remotes...\n'
  git -C "$repo_dir" fetch --all --prune
  printf 'Fast-forwarding %s...\n' "$branch"
  git -C "$repo_dir" pull --ff-only
}

emit_group_repo_paths() {
  require_group_manifest_support

  if [ "$list_groups" = "true" ]; then
    jq -r '.groups[]?.name // empty' "$manifest_path"
    return 0
  fi

  tmp_output=$(mktemp)

  while IFS= read -r group_name; do
    [ -n "$group_name" ] || continue

    if ! jq -e --arg name "$group_name" '.groups[]? | select(.name == $name)' "$manifest_path" >/dev/null; then
      rm -f "$tmp_output"
      printf 'Unknown repo group: %s\n' "$group_name" >&2
      return 1
    fi

    jq -r --arg name "$group_name" '.groups[]? | select(.name == $name) | .repos[]?' "$manifest_path" >>"$tmp_output"
  done <<EOF
$requested_groups
EOF

  awk 'NF && !seen[$0]++' "$tmp_output"
  rm -f "$tmp_output"
}

if [ "$list_groups" = "true" ]; then
  emit_group_repo_paths
  exit 0
fi

if [ -n "$requested_groups" ]; then
  group_repo_paths=$(emit_group_repo_paths)

  printf '%s\n' "$group_repo_paths" | while IFS= read -r repo_rel; do
    [ -n "$repo_rel" ] || continue
    repo_dir="$repos_dir/$repo_rel"

    case "$repo_rel" in
      abilities/*)
        printf '\n[%s]\n' "$repo_rel"
        printf 'Skipping managed ability path. Use tools/scripts/manage-workspace-capabilities.sh update %s\n' "$repo_rel"
        continue
        ;;
    esac

    if [ ! -d "$repo_dir/.git" ]; then
      printf '\n[%s]\n' "$repo_rel"
      printf 'Skipping missing repo path: %s\n' "$repo_dir"
      continue
    fi

    update_repo_dir "$repo_dir"
  done
  exit 0
fi

find "$repos_dir" -type d -name .git -prune | while IFS= read -r git_dir; do
  repo_dir=$(dirname "$git_dir")
  update_repo_dir "$repo_dir"
done
