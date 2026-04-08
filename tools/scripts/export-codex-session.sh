#!/usr/bin/env sh
set -eu

if [ $# -ne 2 ]; then
  printf 'Usage: %s <session-jsonl> <export-dir>\n' "$(basename "$0")" >&2
  exit 1
fi

session_file=$1
export_dir=$2

if [ ! -f "$session_file" ]; then
  printf 'Session file not found: %s\n' "$session_file" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  printf 'jq is required to export Codex sessions.\n' >&2
  exit 1
fi

resolved_dir=$(CDPATH= cd -- "$(dirname -- "$session_file")" && pwd)
session_file="$resolved_dir/$(basename -- "$session_file")"
session_name=$(basename -- "$session_file")
mkdir -p "$export_dir/raw"
cp "$session_file" "$export_dir/raw/$session_name"

thread_id=$(jq -r 'select(.type == "session_meta") | .payload.id // empty' "$session_file" | head -n 1)
session_cwd=$(jq -r 'select(.type == "session_meta") | .payload.cwd // empty' "$session_file" | head -n 1)
session_started_at=$(jq -r 'select(.type == "session_meta") | .payload.timestamp // empty' "$session_file" | head -n 1)
exported_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq -n \
  --arg threadId "$thread_id" \
  --arg sessionFile "$session_file" \
  --arg sessionName "$session_name" \
  --arg sessionStartedAt "$session_started_at" \
  --arg sessionCwd "$session_cwd" \
  --arg exportedAt "$exported_at" \
  '
  {
    threadId: ($threadId | if length > 0 then . else null end),
    sessionFile: $sessionFile,
    sessionName: $sessionName,
    sessionStartedAt: ($sessionStartedAt | if length > 0 then . else null end),
    sessionCwd: ($sessionCwd | if length > 0 then . else null end),
    exportedAt: $exportedAt
  }
  ' >"$export_dir/session.json"

{
  printf '# Codex Session Export\n\n'
  printf -- '- Thread ID: `%s`\n' "${thread_id:-unknown}"
  printf -- '- Session file: `%s`\n' "$session_file"
  if [ -n "$session_started_at" ]; then
    printf -- '- Started at: `%s`\n' "$session_started_at"
  fi
  if [ -n "$session_cwd" ]; then
    printf -- '- Working directory: `%s`\n' "$session_cwd"
  fi
  printf -- '- Exported at: `%s`\n' "$exported_at"
  printf '\n'

  jq -s -r '
    def content_text:
      (.text // .input_text // .output_text // empty);
    [
      .[]
      | select(.payload.type == "message" and (.payload.role == "user" or .payload.role == "assistant"))
      | {
          role: .payload.role,
          timestamp: (.timestamp // ""),
          body: (
            (.payload.content // [])
            | map(content_text)
            | map(select(length > 0))
            | join("\n\n")
          )
        }
      | select(.body | length > 0)
      | "## " + (if .role == "user" then "User" else "Assistant" end)
        + (if .timestamp | length > 0 then " | " + .timestamp else "" end)
        + "\n\n"
        + .body
        + "\n"
    ]
    | if length > 0 then join("\n") else "_No user/assistant transcript messages were found._\n" end
  ' "$session_file"
} >"$export_dir/transcript.md"

printf '%s\n' "$export_dir"
