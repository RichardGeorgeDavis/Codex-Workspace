#!/usr/bin/env sh
set -eu

workspace_root=${1:-"$(pwd)"}
repos_root=${2:-"$workspace_root/repos"}

if [ ! -d "$repos_root" ]; then
  printf 'Repos root not found: %s\n' "$repos_root" >&2
  exit 1
fi

cleanup_script="$workspace_root/tools/scripts/cleanup-sync-noise.sh"

total_repos=0
trimmed_repos=0
skipped_repos=0
total_before_kb=0
total_after_kb=0

repo_list_file=$(mktemp)
trap 'rm -f "$repo_list_file"' EXIT INT TERM

find "$repos_root" -type d -name .git -prune -print >"$repo_list_file"

while IFS= read -r git_dir; do
  repo_dir=${git_dir%/.git}

  if ! git -C "$repo_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf 'skip\t%s\tinvalid git worktree\n' "$repo_dir"
    skipped_repos=$((skipped_repos + 1))
    continue
  fi

  total_repos=$((total_repos + 1))
  before_kb=$(du -sk "$git_dir" | awk '{print $1}')

  if [ -x "$cleanup_script" ]; then
    "$cleanup_script" "$repo_dir" --git-only >/dev/null
  fi

  git -C "$repo_dir" reflog expire --expire=90.days.ago --expire-unreachable=30.days.ago --all >/dev/null 2>&1 || true
  git -C "$repo_dir" gc --prune=30.days.ago >/dev/null 2>&1 || true

  if [ -x "$cleanup_script" ]; then
    "$cleanup_script" "$repo_dir" --git-only >/dev/null
  fi

  after_kb=$(du -sk "$git_dir" | awk '{print $1}')
  delta_kb=$((before_kb - after_kb))

  total_before_kb=$((total_before_kb + before_kb))
  total_after_kb=$((total_after_kb + after_kb))

  if [ "$delta_kb" -gt 0 ]; then
    trimmed_repos=$((trimmed_repos + 1))
    printf 'trim\t%s\t%sKB\t%sKB\t-%sKB\n' "$repo_dir" "$before_kb" "$after_kb" "$delta_kb"
  else
    printf 'keep\t%s\t%sKB\n' "$repo_dir" "$after_kb"
  fi
done <"$repo_list_file"

saved_kb=$((total_before_kb - total_after_kb))

printf 'summary\trepos=%s\ttrimmed=%s\tskipped=%s\tbefore=%sKB\tafter=%sKB\tsaved=%sKB\n' \
  "$total_repos" \
  "$trimmed_repos" \
  "$skipped_repos" \
  "$total_before_kb" \
  "$total_after_kb" \
  "$saved_kb"
