#!/usr/bin/env bash
set -eu

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM
mkdir -p "$tmp/tools/scripts" "$tmp/repos/plain/docs" "$tmp/repos/plain/src"
mkdir -p "$tmp/repos/ai/00-ai-context" "$tmp/repos/brain/library/_catalog" "$tmp/outside"
cp "$script_dir/context-catalog.sh" "$tmp/tools/scripts/context-catalog.sh"
chmod +x "$tmp/tools/scripts/context-catalog.sh"
printf '# Plain\n' > "$tmp/repos/plain/README.md"
printf '# Status\n' > "$tmp/repos/plain/STATUS.md"
printf '# AI\n' > "$tmp/repos/ai/README.md"
printf '# Existing catalog\n' > "$tmp/repos/brain/library/_catalog/index.md"
tool="$tmp/tools/scripts/context-catalog.sh"
"$tool" "$tmp/repos/plain" >/dev/null
[ ! -e "$tmp/repos/plain/docs/CONTEXT_CATALOG.md" ]
"$tool" --run "$tmp/repos/plain" >/dev/null
[ -f "$tmp/repos/plain/docs/CONTEXT_CATALOG.md" ]
grep -q '## Task router' "$tmp/repos/plain/docs/CONTEXT_CATALOG.md"
grep -q '## Folder wiki' "$tmp/repos/plain/docs/CONTEXT_CATALOG.md"
"$tool" --run "$tmp/repos/ai" >/dev/null
[ -f "$tmp/repos/ai/00-ai-context/CONTEXT_CATALOG.md" ]
brain_output="$("$tool" --run "$tmp/repos/brain")"
printf '%s' "$brain_output" | grep -q 'library/_catalog/index.md'
[ ! -e "$tmp/repos/brain/library/_catalog/context-catalog.md" ]
if "$tool" "$tmp/outside" >/dev/null 2>&1; then
  echo "Expected outside-repos rejection" >&2
  exit 1
fi
mkdir -p "$tmp/repos/escape/docs"
if "$tool" --output ../escaped.md "$tmp/repos/escape" >/dev/null 2>&1; then
  echo "Expected output escape rejection" >&2
  exit 1
fi
printf 'preserve\n' > "$tmp/repos/escape/docs/CONTEXT_CATALOG.md"
existing_output="$("$tool" --run "$tmp/repos/escape")"
printf '%s' "$existing_output" | grep -q 'Existing context catalog'
[ "$(cat "$tmp/repos/escape/docs/CONTEXT_CATALOG.md")" = "preserve" ]
echo "context-catalog fixtures passed"
