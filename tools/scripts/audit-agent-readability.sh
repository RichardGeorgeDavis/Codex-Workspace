#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR=""

usage() {
  cat <<'EOF'
Usage: audit-agent-readability.sh [--report <ignored-directory>]

Audit the Codex Workspace agent-entry route without changing tracked files.
Prints a Markdown report to stdout by default. With --report, writes report.md
inside an existing ignored artifact directory.
EOF
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

relative_path() {
  python3 - "$WORKSPACE_ROOT" "$1" <<'PY'
import pathlib
import sys
print(pathlib.Path(sys.argv[2]).resolve().relative_to(pathlib.Path(sys.argv[1]).resolve()).as_posix())
PY
}

resolve_report_dir() {
  python3 - "$WORKSPACE_ROOT" "$1" <<'PY'
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
candidate = pathlib.Path(sys.argv[2])
if not candidate.is_absolute():
    candidate = root / candidate
print(candidate.resolve())
PY
}

safe_report_dir() {
  local target="$1"
  local allowed="$WORKSPACE_ROOT/.workspace/agent-artifacts"
  [[ "$target" = "$allowed" || "$target" == "$allowed"/* ]] || die "Report directory must be under .workspace/agent-artifacts/."
  [[ -d "$target" ]] || die "Report directory must already exist: $target"
}

file_words() {
  wc -w < "$1" | tr -d '[:space:]'
}

link_status() {
  local source="$1"
  local destination="$2"
  if rg -Fq "$destination" "$source"; then
    printf 'pass'
  else
    printf 'fail'
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --report)
      [[ $# -ge 2 ]] || die "--report requires a directory."
      REPORT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "$REPORT_DIR" ]]; then
  REPORT_DIR="$(resolve_report_dir "$REPORT_DIR")"
  safe_report_dir "$REPORT_DIR"
fi

required_files=(
  "AGENTS.md"
  "docs/HANDOVER.md"
  "docs/README.md"
  "docs/20-ai-context-side-load.md"
  "docs/21-agent-token-budget.md"
  "repos/workspace-hub/README.md"
)

missing=()
for relative in "${required_files[@]}"; do
  [[ -f "$WORKSPACE_ROOT/$relative" ]] || missing+=("$relative")
done

handover_age_days="unknown"
if handover_date="$(sed -nE 's/^Last reviewed: ([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/p' "$WORKSPACE_ROOT/docs/HANDOVER.md" | head -n 1)"; then
  if [[ -n "$handover_date" ]]; then
    handover_age_days="$(python3 - "$handover_date" <<'PY'
from datetime import date
import sys
print((date.today() - date.fromisoformat(sys.argv[1])).days)
PY
)"
  fi
fi

cache_entry="$WORKSPACE_ROOT/cache/context/workspace/entry.md"
cache_sources="$WORKSPACE_ROOT/cache/context/workspace/sources.json"
cache_state="missing"
cache_outputs=(
  "$cache_entry"
  "$WORKSPACE_ROOT/cache/context/workspace/abstract.md"
  "$WORKSPACE_ROOT/cache/context/workspace/overview.md"
  "$cache_sources"
)
if [[ -f "$cache_entry" && -f "$cache_sources" ]]; then
  cache_state="fresh"
  for output in "${cache_outputs[@]}"; do
    [[ -f "$output" ]] || cache_state="stale"
  done
  if ! python3 - "$WORKSPACE_ROOT" "$cache_sources" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
payload = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
for item in payload.get("inputs", []):
    path = root / item["path"]
    if not path.exists() or abs(path.stat().st_mtime_ns / 1_000_000 - item["mtimeMs"]) > 0.01:
        raise SystemExit(1)
PY
  then
    cache_state="stale"
  fi
fi

route_checks=(
  "AGENTS.md|docs/HANDOVER.md"
  "docs/README.md|HANDOVER.md"
  "docs/README.md|21-agent-token-budget.md"
  "docs/20-ai-context-side-load.md|entry.md"
  "docs/21-agent-token-budget.md|docs/HANDOVER.md"
)

scan_results="$(python3 -c '
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve()
paths = [root / relative for relative in sys.argv[2:] if (root / relative).is_file()]
prose = {}

for path in paths:
    text = path.read_text(encoding="utf-8", errors="ignore")
    for target in re.findall(r"(?<!!)\[[^]]*\]\(([^)]+)\)", text):
        target = target.strip().split(maxsplit=1)[0]
        local = target.split("#", 1)[0]
        if not local or "://" in local or local.startswith(("mailto:", "/")):
            continue
        resolved = (path.parent / local).resolve()
        status = "pass" if resolved.is_file() and (resolved == root or root in resolved.parents) else "fail"
        print(f"LINK\t{status}\t{path.relative_to(root).as_posix()}\t{target}")
    for line in text.splitlines():
        normalized = " ".join(line.strip().split())
        if len(normalized) < 72 or normalized.startswith(("#", "-", "*", "|", "`")):
            continue
        prose.setdefault(normalized, set()).add(path.relative_to(root).as_posix())

for line, locations in sorted(prose.items()):
    if len(locations) > 1:
        joined_locations = ",".join(sorted(locations))
        print(f"DUP\t{joined_locations}\t{line}")
' "$WORKSPACE_ROOT" "${required_files[@]}")"
link_failure_count="$(printf '%s\n' "$scan_results" | awk -F '\t' '$1 == "LINK" && $2 == "fail" { count++ } END { print count + 0 }')"
duplicate_count="$(printf '%s\n' "$scan_results" | awk -F '\t' '$1 == "DUP" { count++ } END { print count + 0 }')"

report="$(mktemp)"
trap 'rm -f "$report"' EXIT INT TERM
{
  printf '# Agent-readability audit\n\n'
  printf 'Generated: %s\n\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '## Scope\n\n'
  printf 'Workspace root and tracked `repos/workspace-hub` only. Private sibling repositories, generated artifacts, and external services were not inspected.\n\n'
  printf '## Measurements\n\n'
  printf '| Entry document | Words |\n| --- | ---: |\n'
  for relative in "${required_files[@]}"; do
    if [[ -f "$WORKSPACE_ROOT/$relative" ]]; then
      printf '| `%s` | %s |\n' "$relative" "$(file_words "$WORKSPACE_ROOT/$relative")"
    fi
  done
  printf '\n- Handover age: %s day(s) since its declared review date.\n' "$handover_age_days"
  printf -- '- Workspace side-load entry: **%s**.\n\n' "$cache_state"
  printf '## Route checks\n\n'
  printf '| Source | Required route text | Status |\n| --- | --- | --- |\n'
  for check in "${route_checks[@]}"; do
    source="${check%%|*}"
    destination="${check#*|}"
    status="missing"
    if [[ -f "$WORKSPACE_ROOT/$source" ]]; then
      status="$(link_status "$WORKSPACE_ROOT/$source" "$destination")"
    fi
    printf '| `%s` | `%s` | %s |\n' "$source" "$destination" "$status"
  done
  printf '\n## Local link validation\n\n'
  if [[ "$link_failure_count" -eq 0 ]]; then
    printf -- '- All local Markdown links in the entry documents resolve to files inside the workspace.\n'
  else
    printf -- '- %s local Markdown link(s) do not resolve to workspace files.\n' "$link_failure_count"
    printf '%s\n' "$scan_results" | awk -F '\t' '$1 == "LINK" && $2 == "fail" { printf "  - `%s` → `%s`\n", $3, $4 }'
  fi
  printf '\n## Duplicate guidance candidates\n\n'
  if [[ "$duplicate_count" -eq 0 ]]; then
    printf -- '- No exact repeated prose line of 72 or more characters was found across the entry documents.\n'
  else
    printf -- '- %s exact repeated prose candidate(s) found; review before consolidating because repetition can be intentional.\n' "$duplicate_count"
    printf '%s\n' "$scan_results" | awk -F '\t' '$1 == "DUP" { printf "  - `%s`: %s\n", $2, $3 }'
  fi
  printf '\n## Confirmed findings\n\n'
  if [[ "${#missing[@]}" -gt 0 ]]; then
    printf -- '- Missing required entry files: %s.\n' "$(IFS=', '; echo "${missing[*]}")"
  else
    printf -- '- All required tracked entry files are present.\n'
  fi
  if [[ "$cache_state" = "missing" ]]; then
    printf -- '- The optional workspace side-load packet is absent; tracked documentation remains the required fallback.\n'
  elif [[ "$cache_state" = "stale" ]]; then
    printf -- '- The optional workspace side-load packet is stale; regenerate it before relying on it for routing.\n'
  else
    printf -- '- The optional workspace side-load packet is present and source-fresh.\n'
  fi
  if [[ "$link_failure_count" -eq 0 ]]; then
    printf -- '- Local Markdown links in the checked entry documents resolve.\n'
  fi
  printf '\n## Recommendations requiring approval\n\n'
  printf -- '- Review only failed route checks, broken local links, stale/missing packets, exact duplicate candidates, or materially oversized entry documents. Do not edit tracked documentation from this audit.\n'
  printf '\n## Boundaries\n\n'
  printf 'This audit is read-only except for an explicitly requested report written under the ignored `.workspace/agent-artifacts/` path. It does not regenerate caches, update handovers, install dependencies, commit, push, or use external connectors.\n'
} > "$report"

if [[ -n "$REPORT_DIR" ]]; then
  cp "$report" "$REPORT_DIR/report.md"
  printf 'Wrote %s\n' "$(relative_path "$REPORT_DIR/report.md")"
else
  cat "$report"
fi
