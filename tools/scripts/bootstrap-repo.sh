#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
run_mode="dry-run"

usage() {
  printf 'Usage: %s [--run] [repo-path]\n' "$0"
}

read_manifest_install_command() {
  manifest_path=$1

  if [ -f "$manifest_path" ] && command -v jq >/dev/null 2>&1; then
    jq -r '.installCommand // empty' "$manifest_path"
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="run"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

repo_dir=${1:-.}
repo_dir=$(CDPATH= cd -- "$repo_dir" && pwd)
manifest_path="$repo_dir/.workspace/project.json"
install_command=$(read_manifest_install_command "$manifest_path" || true)

if [ -z "$install_command" ]; then
  if [ -f "$repo_dir/pnpm-lock.yaml" ]; then
    install_command="pnpm install"
  elif [ -f "$repo_dir/yarn.lock" ]; then
    install_command="yarn install"
  elif [ -f "$repo_dir/package-lock.json" ] || [ -f "$repo_dir/npm-shrinkwrap.json" ] || [ -f "$repo_dir/package.json" ]; then
    install_command="npm install"
  elif [ -f "$repo_dir/composer.json" ]; then
    install_command="composer install"
  elif [ -f "$repo_dir/requirements.txt" ]; then
    install_command="python3 -m pip install -r requirements.txt"
  fi
fi

if [ -z "$install_command" ]; then
  printf 'No bootstrap command detected for %s\n' "$repo_dir" >&2
  exit 1
fi

printf 'Repo: %s\n' "$repo_dir"
printf 'Command: %s\n' "$install_command"

if [ "$run_mode" = "dry-run" ]; then
  printf 'Dry run only. Re-run with --run to execute.\n'
  exit 0
fi

cd "$repo_dir"
exec sh -lc "$install_command"
