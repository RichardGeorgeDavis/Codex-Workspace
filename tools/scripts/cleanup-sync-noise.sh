#!/usr/bin/env sh
set -eu

target_path=.
target_path_set=0
cleanup_mode=--all
run_mode=--dry-run

usage() {
  printf 'Usage: %s [path] [--all|--git-only] [--dry-run|--run]\n' "$0" >&2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --all|--git-only)
      cleanup_mode=$1
      ;;
    --dry-run|--run)
      run_mode=$1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      usage
      exit 1
      ;;
    *)
      if [ "$target_path_set" -eq 1 ]; then
        usage
        exit 1
      fi
      target_path=$1
      target_path_set=1
      ;;
  esac
  shift
done

case "$cleanup_mode" in
  --all|--git-only) ;;
  *)
    usage
    exit 1
    ;;
esac

case "$run_mode" in
  --dry-run|--run) ;;
  *)
    usage
    exit 1
    ;;
esac

if [ ! -e "$target_path" ]; then
  printf 'Target path not found: %s\n' "$target_path" >&2
  exit 1
fi

python3 - "$target_path" "$cleanup_mode" "$run_mode" <<'PY'
import os
import sys

target_path = os.path.abspath(sys.argv[1])
cleanup_mode = sys.argv[2]
run_mode = sys.argv[3]

matched = 0
matched_git = 0
matched_plain = 0
removed = 0
removed_git = 0
removed_plain = 0

for dirpath, dirnames, filenames in os.walk(target_path):
    for name in filenames:
        name_bytes = os.fsencode(name)
        is_noise = name == '.DS_Store' or name_bytes == b'Icon\r' or name.startswith('._')
        if not is_noise:
            continue

        path = os.path.join(dirpath, name)
        is_git_path = '/.git/' in path or path.endswith('/.git/' + name) or '/.git' + os.sep in path

        if cleanup_mode == '--git-only' and not is_git_path:
            continue

        matched += 1
        if is_git_path:
            matched_git += 1
        else:
            matched_plain += 1

        if run_mode != '--run':
            continue

        try:
            os.remove(path)
        except FileNotFoundError:
            continue

        removed += 1
        if is_git_path:
            removed_git += 1
        else:
            removed_plain += 1

print(f'target={target_path}')
print(f'mode={cleanup_mode}')
print(f'run={run_mode}')
print(f'matched={matched}')
print(f'matched_git={matched_git}')
print(f'matched_plain={matched_plain}')
print(f'would_remove={0 if run_mode == "--run" else matched}')
print(f'removed={removed}')
print(f'removed_git={removed_git}')
print(f'removed_plain={removed_plain}')
PY
