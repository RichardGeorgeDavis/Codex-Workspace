#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/public-release-hygiene.XXXXXX")"
trap 'rm -rf "$fixture_root"' EXIT

git -C "$fixture_root" init -q
git -C "$fixture_root" config user.email fixture@example.test
git -C "$fixture_root" config user.name fixture
printf 'safe tracked text\n' >"$fixture_root/README.md"
git -C "$fixture_root" add README.md
git -C "$fixture_root" commit -qm fixture

git -C "$fixture_root" ls-files >/dev/null
if ! (cd "$fixture_root" && "$WORKSPACE_ROOT/tools/scripts/check-public-secrets.sh" >/dev/null); then
  printf 'Expected safe tracked fixture to pass.\n' >&2
  exit 1
fi

printf '%s%s\n' 'AIza' '0123456789abcdefghijklmnop' >"$fixture_root/leak.txt"
git -C "$fixture_root" add leak.txt
if (cd "$fixture_root" && "$WORKSPACE_ROOT/tools/scripts/check-public-secrets.sh" >/dev/null 2>&1); then
  printf 'Expected tracked credential fixture to fail.\n' >&2
  exit 1
fi

printf 'public-release-hygiene fixture checks passed\n'
