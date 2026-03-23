#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"
run_mode="dry-run"
target_mode="single"
target_repo_arg=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] [--all] [repo-path]

Sync tracked Codex skill sources into a repo's .agents/skills/ folder.

Default behavior is a dry run. Use --run to apply changes.

Source order:
1. shared/skills/
2. <repo>/.workspace/skills/

Repo-local .workspace/skills/ entries overwrite shared/skills/ entries with
the same top-level name. Unmanaged files already in .agents/skills/ are left
alone; this script only replaces entries that come from tracked source folders.

Examples:
  $0 repos/workspace-hub
  $0 --run repos/workspace-hub
  $0 --all
  $0 --run --all
EOF
}

is_repo_dir() {
  case "$1" in
    "$repos_dir"/*) return 0 ;;
    *) return 1 ;;
  esac
}

sync_source_dir() {
  source_dir=$1
  target_dir=$2

  [ -d "$source_dir" ] || return 0

  find "$source_dir" -mindepth 1 -maxdepth 1 | LC_ALL=C sort | while IFS= read -r source_path; do
    [ -d "$source_path" ] || continue
    [ -f "$source_path/SKILL.md" ] || continue

    item_name=$(basename "$source_path")
    target_path="$target_dir/$item_name"

    if [ "$run_mode" = "dry-run" ]; then
      if [ -e "$target_path" ]; then
        printf '  replace %s <- %s\n' "$target_path" "$source_path"
      else
        printf '  add     %s <- %s\n' "$target_path" "$source_path"
      fi
      continue
    fi

    mkdir -p "$target_dir"
    rm -rf "$target_path"
    cp -R "$source_path" "$target_path"
    printf '  synced  %s <- %s\n' "$target_path" "$source_path"
  done
}

sync_repo() {
  repo_dir=$1

  if ! is_repo_dir "$repo_dir"; then
    printf 'Refusing to sync outside %s: %s\n' "$repos_dir" "$repo_dir" >&2
    return 1
  fi

  shared_source="$workspace_root/shared/skills"
  repo_source="$repo_dir/.workspace/skills"
  target_dir="$repo_dir/.agents/skills"

  printf 'Repo: %s\n' "$repo_dir"
  printf 'Target: %s\n' "$target_dir"

  found_source=0
  if [ -d "$shared_source" ]; then
    found_source=1
    printf 'Sources:\n'
    printf '  %s\n' "$shared_source"
  fi
  if [ -d "$repo_source" ]; then
    if [ "$found_source" -eq 0 ]; then
      printf 'Sources:\n'
    fi
    found_source=1
    printf '  %s\n' "$repo_source"
  fi

  if [ "$found_source" -eq 0 ]; then
    printf 'No tracked skill sources found. Skipping.\n'
    return 0
  fi

  if [ "$run_mode" = "dry-run" ]; then
    printf 'Mode: dry run\n'
  else
    printf 'Mode: apply\n'
  fi

  sync_source_dir "$shared_source" "$target_dir"
  sync_source_dir "$repo_source" "$target_dir"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="run"
      shift
      ;;
    --all)
      target_mode="all"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [ -n "$target_repo_arg" ]; then
        usage >&2
        exit 1
      fi
      target_repo_arg=$1
      shift
      ;;
  esac
done

if [ "$target_mode" = "all" ] && [ -n "$target_repo_arg" ]; then
  printf 'Use either --all or a repo path, not both.\n' >&2
  exit 1
fi

if [ "$target_mode" = "all" ]; then
  found_repo=0
  for repo_dir in "$repos_dir"/*; do
    [ -d "$repo_dir" ] || continue
    found_repo=1
    sync_repo "$(CDPATH= cd -- "$repo_dir" && pwd)"
    printf '\n'
  done

  if [ "$found_repo" -eq 0 ]; then
    printf 'No repos found under %s\n' "$repos_dir" >&2
    exit 1
  fi

  exit 0
fi

repo_dir=${target_repo_arg:-.}
repo_dir=$(CDPATH= cd -- "$repo_dir" && pwd)

if [ "$repo_dir" = "$workspace_root" ]; then
  printf 'Pass a repo path under %s or use --all.\n' "$repos_dir" >&2
  exit 1
fi

sync_repo "$repo_dir"
