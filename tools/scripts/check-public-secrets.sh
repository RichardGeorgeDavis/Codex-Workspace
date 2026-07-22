#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  printf 'Error: run this inside a Git worktree.\n' >&2
  exit 1
}
cd "$ROOT"

pattern='-----BEGIN [^-]+ PRIVATE KEY-----|\b(AIza[[:alnum:]_-]{20,}|ghp_[[:alnum:]]{36}|github_pat_[[:alnum:]_]{20,}|sk-[[:alnum:]_-]{20,}|xox[baprs]-[[:alnum:]-]{20,})\b'
tracked_hits="$(git grep -nP -e "$pattern" -- . ':!cache/**' || true)"
diff_hits="$(git diff --no-ext-diff --unified=0 HEAD -- . | rg -n --pcre2 -e "^\+[^+].*($pattern)" || true)"

if [[ -n "$tracked_hits" || -n "$diff_hits" ]]; then
  printf 'Error: probable credential material found in tracked content or current tracked diff.\n' >&2
  [[ -z "$tracked_hits" ]] || printf '%s\n' "$tracked_hits" >&2
  [[ -z "$diff_hits" ]] || printf '%s\n' "$diff_hits" >&2
  exit 1
fi

printf 'Public tracked-content secret scan passed.\n'
