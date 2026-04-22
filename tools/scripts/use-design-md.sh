#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
source_repo_id="voltagent-awesome-design-md"
source_repo_dir="$workspace_root/repos/abilities/voltagent-awesome-design-md"
source_design_dir="$source_repo_dir/design-md"
cache_root="$workspace_root/cache/design-md"
catalog_dir="$cache_root/catalog"
update_script="$workspace_root/tools/scripts/update-github-refs.sh"

refresh_catalog="false"
sync_upstream="false"
list_only="false"
force_overwrite="false"
site_id=""
target_dir=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--list] [--refresh] [--sync-upstream] [--force] [site-id] [target-dir]

Browse, mirror, and copy reviewed example DESIGN.md files from the managed VoltAgent catalog repo.

Examples:
  $0 --list
  $0 --refresh
  $0 --sync-upstream --refresh
  $0 vercel
  $0 vercel /path/to/repo

Behavior:
  --list           list available example site ids from the local catalog mirror
  --refresh        rebuild cache/design-md/catalog from the managed repos/abilities clone
  --sync-upstream  update the managed repos/abilities clone first
  --force          overwrite an existing target DESIGN.md when copying

This script is the example-catalog wrapper. The canonical repo-authoring flow uses
tools/scripts/design-md.sh plus a repo-owned DESIGN.md.

If site-id is provided, the script copies that example DESIGN.md into target-dir/DESIGN.md.
The default target directory is the current working directory.
EOF
}

ensure_source_repo() {
  if [ -d "$source_design_dir" ]; then
    return 0
  fi

  printf 'Missing DESIGN.md source repo: %s\n' "$source_repo_dir" >&2
  printf 'Run %s --run %s or rerun this script with --sync-upstream.\n' "$update_script" "$source_repo_id" >&2
  exit 1
}

rebuild_catalog() {
  ensure_source_repo

  rm -rf "$catalog_dir"
  mkdir -p "$catalog_dir"

  find "$source_design_dir" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort | while IFS= read -r site_dir; do
    [ -n "$site_dir" ] || continue
    site_name=$(basename "$site_dir")
    if [ -f "$site_dir/DESIGN.md" ]; then
      mkdir -p "$catalog_dir/$site_name"
      cp "$site_dir/DESIGN.md" "$catalog_dir/$site_name/DESIGN.md"
    fi
  done

  generated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  {
    printf 'source_repo=https://github.com/VoltAgent/awesome-design-md\n'
    printf 'source_repo_path=%s\n' "$source_repo_dir"
    printf 'generated_at_utc=%s\n' "$generated_at"
  } >"$cache_root/manifest.txt"

  count=$(find "$catalog_dir" -name DESIGN.md | wc -l | awk '{print $1}')
  printf 'Catalog refreshed: %s (%s DESIGN.md files)\n' "$catalog_dir" "$count"
}

ensure_catalog() {
  if [ -d "$catalog_dir" ] && [ -n "$(find "$catalog_dir" -name DESIGN.md -print -quit 2>/dev/null || true)" ]; then
    return 0
  fi

  rebuild_catalog
}

list_catalog() {
  ensure_catalog
  find "$catalog_dir" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort | while IFS= read -r site_dir; do
    basename "$site_dir"
  done
}

copy_design_md() {
  ensure_catalog

  source_file="$catalog_dir/$site_id/DESIGN.md"
  if [ ! -f "$source_file" ]; then
    printf 'Unknown site id: %s\n' "$site_id" >&2
    printf 'Run %s --list\n' "$0" >&2
    exit 1
  fi

  if [ -z "$target_dir" ]; then
    target_dir=$(pwd)
  fi

  mkdir -p "$target_dir"
  target_file="$target_dir/DESIGN.md"

  if [ -f "$target_file" ] && [ "$force_overwrite" != "true" ]; then
    printf 'Refusing to overwrite existing file: %s\n' "$target_file" >&2
    printf 'Re-run with --force if replacement is intentional.\n' >&2
    exit 1
  fi

  cp "$source_file" "$target_file"
  printf 'Copied: %s -> %s\n' "$source_file" "$target_file"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --list)
      list_only="true"
      shift
      ;;
    --refresh)
      refresh_catalog="true"
      shift
      ;;
    --sync-upstream)
      sync_upstream="true"
      shift
      ;;
    --force)
      force_overwrite="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      usage >&2
      exit 1
      ;;
    *)
      if [ -z "$site_id" ]; then
        site_id=$1
      elif [ -z "$target_dir" ]; then
        target_dir=$1
      else
        usage >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [ "$sync_upstream" = "true" ]; then
  UPDATE_GITHUB_REFS_SKIP_DESIGN_REFRESH=1 "$update_script" --run "$source_repo_id"
  refresh_catalog="true"
fi

if [ "$refresh_catalog" = "true" ]; then
  rebuild_catalog
fi

if [ "$list_only" = "true" ]; then
  list_catalog
  exit 0
fi

if [ -n "$site_id" ]; then
  copy_design_md
  exit 0
fi

if [ "$refresh_catalog" = "true" ] || [ "$sync_upstream" = "true" ]; then
  exit 0
fi

usage
