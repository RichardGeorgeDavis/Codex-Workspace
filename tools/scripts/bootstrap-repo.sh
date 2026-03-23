#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
run_mode="dry-run"

usage() {
  printf 'Usage: %s [--run] [repo-path]\n' "$0"
  printf 'Respects .workspace/project.json installCommand first, then package-manager precedence.\n'
  printf 'Optional env override: WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER=npm|pnpm|yarn|bun\n'
}

read_json_string_field() {
  file_path=$1
  field_name=$2

  if [ ! -f "$file_path" ]; then
    return 0
  fi

  if command -v jq >/dev/null 2>&1; then
    jq -r ".$field_name // empty" "$file_path"
    return 0
  fi

  sed -n "s/.*\"$field_name\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$file_path" | sed -n '1p'
}

normalize_package_manager() {
  package_manager=$1
  package_manager=${package_manager%%@*}

  case "$package_manager" in
    npm|pnpm|yarn|bun)
      printf '%s\n' "$package_manager"
      ;;
    *)
      printf '\n'
      ;;
  esac
}

install_command_from_package_manager() {
  package_manager=$1

  case "$package_manager" in
    pnpm)
      printf 'pnpm install\n'
      ;;
    yarn)
      printf 'yarn install\n'
      ;;
    npm)
      printf 'npm install\n'
      ;;
    bun)
      printf 'bun install\n'
      ;;
    *)
      printf '\n'
      ;;
  esac
}

detect_lockfile_package_manager() {
  repo_dir=$1

  if [ -f "$repo_dir/pnpm-lock.yaml" ]; then
    printf 'pnpm\n'
  elif [ -f "$repo_dir/yarn.lock" ]; then
    printf 'yarn\n'
  elif [ -f "$repo_dir/package-lock.json" ] || [ -f "$repo_dir/npm-shrinkwrap.json" ]; then
    printf 'npm\n'
  elif [ -f "$repo_dir/bun.lock" ] || [ -f "$repo_dir/bun.lockb" ]; then
    printf 'bun\n'
  elif [ -f "$repo_dir/package.json" ]; then
    printf 'npm\n'
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
package_json_path="$repo_dir/package.json"
install_command=$(read_json_string_field "$manifest_path" installCommand || true)
command_source=""

if [ -z "$install_command" ]; then
  package_manager=""

  if [ -n "${WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER:-}" ]; then
    package_manager=$(normalize_package_manager "$WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER")
    if [ -n "$package_manager" ]; then
      command_source="env WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER"
    else
      printf 'Ignoring unsupported WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER=%s\n' "$WORKSPACE_BOOTSTRAP_PACKAGE_MANAGER" >&2
    fi
  fi

  if [ -z "$package_manager" ]; then
    manifest_package_manager=$(read_json_string_field "$manifest_path" packageManager || true)
    package_manager=$(normalize_package_manager "$manifest_package_manager")
    if [ -n "$package_manager" ]; then
      command_source=".workspace/project.json packageManager"
    fi
  fi

  if [ -z "$package_manager" ]; then
    package_json_package_manager=$(read_json_string_field "$package_json_path" packageManager || true)
    package_manager=$(normalize_package_manager "$package_json_package_manager")
    if [ -n "$package_manager" ]; then
      command_source="package.json packageManager"
    fi
  fi

  if [ -z "$package_manager" ]; then
    package_manager=$(detect_lockfile_package_manager "$repo_dir" || true)
    if [ -n "$package_manager" ]; then
      command_source="lockfile detection"
    fi
  fi

  if [ -n "$package_manager" ]; then
    install_command=$(install_command_from_package_manager "$package_manager")
  elif [ -f "$repo_dir/composer.json" ]; then
    command_source="composer.json detection"
    install_command="composer install"
  elif [ -f "$repo_dir/requirements.txt" ]; then
    command_source="requirements.txt detection"
    install_command="python3 -m pip install -r requirements.txt"
  fi
else
  command_source=".workspace/project.json installCommand"
fi

if [ -z "$install_command" ]; then
  printf 'No bootstrap command detected for %s\n' "$repo_dir" >&2
  exit 1
fi

printf 'Repo: %s\n' "$repo_dir"
printf 'Command: %s\n' "$install_command"
if [ -n "$command_source" ]; then
  printf 'Source: %s\n' "$command_source"
fi

if [ "$run_mode" = "dry-run" ]; then
  printf 'Dry run only. Re-run with --run to execute.\n'
  exit 0
fi

cd "$repo_dir"
exec sh -lc "$install_command"
