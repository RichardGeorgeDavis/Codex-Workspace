#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
run_mode="dry-run"
continue_mode="false"
force_mode="false"
depth="5"
scope="same-domain"
ref_dir="ref/httrack"
target_dir=""
url=""
extra_args=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run] [--continue] [--force] [--depth N] [--same-address|--same-domain|--same-tld|--go-everywhere] [--ref-dir path] <url> [target-dir] [-- extra httrack args]

Prepare or run a conservative HTTrack capture for a public-site reference repo.

Default behavior is a dry run. Use --run to execute the mirror command.

Examples:
  $0 https://example.com /absolute/path/to/repo
  $0 --run https://example.com /absolute/path/to/repo
  $0 --run --continue https://example.com /absolute/path/to/repo
  $0 --run --depth 8 --same-address https://example.com current/repo
  $0 --run https://example.com ./repos/example-reference -- --user-agent "Mozilla/5.0"

Behavior:
  --run             execute HTTrack instead of printing the planned command
  --continue        continue an existing HTTrack capture in the target dir
  --force           allow capture into a non-empty target dir with repo content
  --depth N         set HTTrack crawl depth (default: 5)
  --same-address    keep requests on the same address only
  --same-domain     keep requests on the same principal domain (default)
  --same-tld        keep requests on the same top-level domain
  --go-everywhere   allow traversal outside the starting domain
  --ref-dir path    repo-local metadata folder relative to the target dir

The wrapper writes a capture note under ref/httrack/ after a successful run so
README/HANDOVER updates can reference the source URL, method, and timestamp.
EOF
}

append_extra_arg() {
  next_arg=$1
  if [ -n "$extra_args" ]; then
    extra_args=$(printf '%s\n%s' "$extra_args" "$next_arg")
  else
    extra_args=$next_arg
  fi
}

append_prepared_arg() {
  next_arg=$1
  if [ -n "$prepared_command_args" ]; then
    prepared_command_args=$(printf '%s\n%s' "$prepared_command_args" "$next_arg")
  else
    prepared_command_args=$next_arg
  fi
}

quote_arg() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

resolve_absolute_path() {
  candidate=$1
  case "$candidate" in
    /*)
      printf '%s\n' "$candidate"
      ;;
    *)
      printf '%s/%s\n' "$(pwd)" "$candidate"
      ;;
  esac
}

list_target_entries() {
  find "$target_dir" -mindepth 1 -maxdepth 1 -exec sh -c 'for path do basename "$path"; done' sh {} + \
    | LC_ALL=C sort
}

is_safe_existing_entry() {
  entry_name=$1
  case "$entry_name" in
    .agents|.codex|.git|.gitattributes|.gitignore|.workspace|README.md|HANDOVER.md|docs|ref)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

ensure_httrack_available() {
  if command -v httrack >/dev/null 2>&1; then
    return 0
  fi

  printf 'httrack is required.\n' >&2
  printf 'Install it with Homebrew, for example:\n' >&2
  printf "  HOMEBREW_CACHE='%s/cache/homebrew' brew install httrack\n" "$workspace_root" >&2
  exit 1
}

ensure_target_is_safe() {
  if [ ! -d "$target_dir" ]; then
    return 0
  fi

  if [ "$continue_mode" = "true" ] || [ "$force_mode" = "true" ]; then
    return 0
  fi

  target_entries=$(list_target_entries || true)
  if [ -z "$target_entries" ]; then
    return 0
  fi

  unsafe_entries=""
  old_ifs=$IFS
  IFS='
'
  for entry_name in $target_entries; do
    [ -n "$entry_name" ] || continue
    if ! is_safe_existing_entry "$entry_name"; then
      if [ -n "$unsafe_entries" ]; then
        unsafe_entries=$(printf '%s\n%s' "$unsafe_entries" "$entry_name")
      else
        unsafe_entries=$entry_name
      fi
    fi
  done
  IFS=$old_ifs

  if [ -z "$unsafe_entries" ]; then
    return 0
  fi

  printf 'Refusing to capture into a non-empty target directory without --force or --continue.\n' >&2
  printf 'Target: %s\n' "$target_dir" >&2
  printf 'Unexpected top-level entries:\n' >&2
  printf '%s\n' "$unsafe_entries" >&2
  exit 1
}

append_scope_arg() {
  case "$scope" in
    same-address)
      append_prepared_arg --stay-on-same-address
      ;;
    same-domain)
      append_prepared_arg --stay-on-same-domain
      ;;
    same-tld)
      append_prepared_arg --stay-on-same-tld
      ;;
    everywhere)
      append_prepared_arg --go-everywhere
      ;;
    *)
      printf 'Unsupported scope: %s\n' "$scope" >&2
      exit 1
      ;;
  esac
}

prepare_command_args() {
  prepared_command_args=""
  append_prepared_arg httrack
  append_prepared_arg "$url"
  append_prepared_arg --path
  append_prepared_arg "$target_dir"
  append_prepared_arg --mirror
  append_prepared_arg "--depth=$depth"
  append_prepared_arg --ext-depth=0
  append_prepared_arg --near
  append_prepared_arg --robots=2

  append_scope_arg

  if [ "$continue_mode" = "true" ]; then
    append_prepared_arg --continue
  fi

  if [ -n "$extra_args" ]; then
    prepared_command_args=$(printf '%s\n%s' "$prepared_command_args" "$extra_args")
  fi

  printf '%s\n' "$prepared_command_args"
}

print_planned_command() {
  command_args=$1
  old_ifs=$IFS
  IFS='
'
  set -- $command_args
  IFS=$old_ifs

  first_arg="true"
  for next_arg in "$@"; do
    if [ "$first_arg" = "true" ]; then
      first_arg="false"
    else
      printf ' '
    fi
    quote_arg "$next_arg"
  done
  printf '\n'
}

write_capture_note() {
  metadata_dir="$target_dir/$ref_dir"
  mkdir -p "$metadata_dir"

  timestamp_compact=$(date -u +"%Y%m%dT%H%M%SZ")
  timestamp_pretty=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  version=$(httrack --version 2>/dev/null | sed -n '1p')
  capture_note="$metadata_dir/capture-$timestamp_compact.txt"

  {
    printf 'source_url=%s\n' "$url"
    printf 'captured_at_utc=%s\n' "$timestamp_pretty"
    printf 'tool=%s\n' "${version:-HTTrack}"
    printf 'scope=%s\n' "$scope"
    printf 'depth=%s\n' "$depth"
    printf 'continued=%s\n' "$continue_mode"
    printf 'ref_dir=%s\n' "$ref_dir"
    printf 'command='
    print_planned_command "$command_args"
  } >"$capture_note"

  printf 'Capture note: %s\n' "$capture_note"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="run"
      shift
      ;;
    --continue)
      continue_mode="true"
      shift
      ;;
    --force)
      force_mode="true"
      shift
      ;;
    --depth)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      depth=$1
      shift
      ;;
    --same-address)
      scope="same-address"
      shift
      ;;
    --same-domain)
      scope="same-domain"
      shift
      ;;
    --same-tld)
      scope="same-tld"
      shift
      ;;
    --go-everywhere)
      scope="everywhere"
      shift
      ;;
    --ref-dir)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      ref_dir=$1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      while [ $# -gt 0 ]; do
        append_extra_arg "$1"
        shift
      done
      break
      ;;
    -*)
      usage >&2
      exit 1
      ;;
    *)
      if [ -z "$url" ]; then
        url=$1
      elif [ -z "$target_dir" ]; then
        target_dir=$1
      else
        usage >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$url" ]; then
  usage >&2
  exit 1
fi

case "$url" in
  http://*|https://*) ;;
  *)
    printf 'URL must start with http:// or https://\n' >&2
    exit 1
    ;;
esac

case "$ref_dir" in
  /*|..|../*|*/../*)
    printf 'ref-dir must stay inside the target directory.\n' >&2
    exit 1
    ;;
esac

if [ -z "$target_dir" ]; then
  target_dir=$(pwd)
else
  target_dir=$(resolve_absolute_path "$target_dir")
fi

ensure_httrack_available
ensure_target_is_safe

command_args=$(prepare_command_args)

printf 'Source: %s\n' "$url"
printf 'Target: %s\n' "$target_dir"
printf 'Scope: %s\n' "$scope"
printf 'Depth: %s\n' "$depth"
printf 'Metadata: %s/%s\n' "$target_dir" "$ref_dir"
printf 'Mode: %s\n' "$run_mode"
printf 'Command: '
print_planned_command "$command_args"

if [ "$run_mode" != "run" ]; then
  exit 0
fi

mkdir -p "$target_dir"

old_ifs=$IFS
IFS='
'
set -- $command_args
IFS=$old_ifs
"$@"

write_capture_note
