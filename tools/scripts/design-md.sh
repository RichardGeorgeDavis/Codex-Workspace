#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
template_path=${DESIGN_MD_TEMPLATE_PATH:-$workspace_root/tools/templates/design-md/DESIGN.template.md}
examples_script=${DESIGN_MD_EXAMPLES_SCRIPT:-$workspace_root/tools/scripts/use-design-md.sh}
npx_bin=${DESIGN_MD_NPX_BIN:-npx}

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [args]

Canonical repo-level DESIGN.md workflow for this workspace.

Commands:
  init [--force] [repo-or-file]
      Copy the starter template into repo-root DESIGN.md.
      Defaults to the current directory.

  lint [file-or-repo]
      Run npx @google/design.md lint against a DESIGN.md file.
      Defaults to the current directory.

  diff <file-or-repo-a> <file-or-repo-b>
      Run npx @google/design.md diff against two DESIGN.md files.

  examples list [extra args...]
      List available example DESIGN.md files from the optional VoltAgent catalog.

  examples copy [--force] <site-id> [target-dir]
      Copy an example DESIGN.md from the optional VoltAgent catalog.

  help
      Show this help.
EOF
}

require_template() {
  if [ ! -f "$template_path" ]; then
    printf 'Missing DESIGN.md template: %s\n' "$template_path" >&2
    exit 1
  fi
}

resolve_design_path() {
  input_path=${1:-$(pwd)}

  if [ -d "$input_path" ]; then
    printf '%s/DESIGN.md\n' "${input_path%/}"
    return 0
  fi

  case "$(basename "$input_path")" in
    DESIGN.md)
      printf '%s\n' "$input_path"
      ;;
    *)
      printf '%s\n' "$input_path"
      ;;
  esac
}

require_design_file() {
  design_path=$1

  if [ ! -f "$design_path" ]; then
    printf 'Missing DESIGN.md file: %s\n' "$design_path" >&2
    exit 1
  fi
}

run_init() {
  force_overwrite=false
  target_input=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --force)
        force_overwrite=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        if [ -n "$target_input" ]; then
          usage >&2
          exit 1
        fi
        target_input=$1
        shift
        ;;
    esac
  done

  require_template
  target_path=$(resolve_design_path "${target_input:-$(pwd)}")
  target_dir=$(dirname "$target_path")

  mkdir -p "$target_dir"

  if [ -f "$target_path" ] && [ "$force_overwrite" != "true" ]; then
    printf 'Refusing to overwrite existing file: %s\n' "$target_path" >&2
    printf 'Re-run with --force if replacement is intentional.\n' >&2
    exit 1
  fi

  cp "$template_path" "$target_path"
  printf 'Initialized: %s\n' "$target_path"
}

run_lint() {
  target_path=$(resolve_design_path "${1:-$(pwd)}")
  require_design_file "$target_path"
  exec "$npx_bin" -y "@google/design.md" lint "$target_path"
}

run_diff() {
  if [ $# -ne 2 ]; then
    usage >&2
    exit 1
  fi

  first_path=$(resolve_design_path "$1")
  second_path=$(resolve_design_path "$2")
  require_design_file "$first_path"
  require_design_file "$second_path"
  exec "$npx_bin" -y "@google/design.md" diff "$first_path" "$second_path"
}

run_examples() {
  if [ $# -eq 0 ]; then
    exec "$examples_script"
  fi

  case "$1" in
    list)
      shift
      exec "$examples_script" --list "$@"
      ;;
    copy)
      shift
      force_flag=""
      if [ "${1:-}" = "--force" ]; then
        force_flag="--force"
        shift
      fi

      if [ $# -lt 1 ] || [ $# -gt 2 ]; then
        usage >&2
        exit 1
      fi

      if [ -n "$force_flag" ]; then
        exec "$examples_script" "$force_flag" "$@"
      fi

      exec "$examples_script" "$@"
      ;;
    *)
      exec "$examples_script" "$@"
      ;;
  esac
}

command_name=${1:-help}
if [ $# -gt 0 ]; then
  shift
fi

case "$command_name" in
  init)
    run_init "$@"
    ;;
  lint)
    run_lint "$@"
    ;;
  diff)
    run_diff "$@"
    ;;
  examples)
    run_examples "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
