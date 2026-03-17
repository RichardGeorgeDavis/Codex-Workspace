#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repos_dir="$workspace_root/repos"
manifest_path=${1:-"$workspace_root/tools/manifests/repos.example.txt"}

if [ ! -f "$manifest_path" ]; then
  printf 'Manifest not found: %s\n' "$manifest_path" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf 'git is required.\n' >&2
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|'#'*) continue ;;
  esac

  url=$(printf '%s\n' "$line" | awk '{print $1}')
  destination=$(printf '%s\n' "$line" | awk '{print $2}')

  if [ -z "$url" ]; then
    continue
  fi

  if [ -z "$destination" ]; then
    destination=$(basename "$url")
    destination=${destination%.git}
  fi

  target="$repos_dir/$destination"

  if [ -e "$target" ]; then
    printf 'Skipping existing path: %s\n' "$target"
    continue
  fi

  mkdir -p "$(dirname "$target")"
  printf 'Cloning %s -> %s\n' "$url" "$target"
  git clone "$url" "$target"
done < "$manifest_path"
