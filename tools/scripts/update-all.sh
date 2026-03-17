#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"

if ! command -v git >/dev/null 2>&1; then
  printf 'git is required.\n' >&2
  exit 1
fi

find "$repos_dir" -type d -name .git -prune | while IFS= read -r git_dir; do
  repo_dir=$(dirname "$git_dir")
  repo_name=$(basename "$repo_dir")
  printf '\n[%s]\n' "$repo_name"

  if [ -n "$(git -C "$repo_dir" status --porcelain)" ]; then
    printf 'Skipping dirty working tree.\n'
    continue
  fi

  branch=$(git -C "$repo_dir" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  if [ -z "$branch" ]; then
    printf 'Skipping detached HEAD.\n'
    continue
  fi

  if ! git -C "$repo_dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    printf 'Skipping branch without upstream: %s\n' "$branch"
    continue
  fi

  printf 'Fetching remotes...\n'
  git -C "$repo_dir" fetch --all --prune
  printf 'Fast-forwarding %s...\n' "$branch"
  git -C "$repo_dir" pull --ff-only
done
