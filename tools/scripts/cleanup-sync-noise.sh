#!/usr/bin/env sh
set -eu

target_path=${1:-.}
cleanup_mode=${2:---all}

case "$cleanup_mode" in
  --all|--git-only) ;;
  *)
    printf 'Usage: %s [path] [--all|--git-only]\n' "$0" >&2
    exit 1
    ;;
esac

python3 - "$target_path" "$cleanup_mode" <<'PY'
import os
import sys

target_path = os.path.abspath(sys.argv[1])
cleanup_mode = sys.argv[2]

removed = 0
removed_git = 0
removed_plain = 0

for dirpath, dirnames, filenames in os.walk(target_path):
    for name in filenames:
        name_bytes = os.fsencode(name)
        is_noise = name_bytes == b'Icon\r' or name.startswith('._')
        if not is_noise:
            continue

        path = os.path.join(dirpath, name)
        is_git_path = '/.git/' in path or path.endswith('/.git/' + name) or '/.git' + os.sep in path

        if cleanup_mode == '--git-only' and not is_git_path:
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
print(f'removed={removed}')
print(f'removed_git={removed_git}')
print(f'removed_plain={removed_plain}')
PY
