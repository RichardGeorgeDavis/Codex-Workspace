#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
repo_template="$workspace_root/tools/templates/agents-md/repo.agents.template.md"
folder_template="$workspace_root/tools/templates/agents-md/folder.agents.template.md"
force="false"
max_depth="2"
target_dir="."

usage() {
  cat <<EOF
Usage: $(basename "$0") [--force] [--max-depth N] [path]

Scaffold a lightweight AGENTS.md tree for a repo or subtree.
Creates one root AGENTS.md plus child-folder AGENTS.md files up to the selected depth.
EOF
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

render_template() {
  template_path=$1
  title=$2
  relative_path=$3
  parent_label=$4

  sed \
    -e "s/__TITLE__/$(escape_sed_replacement "$title")/g" \
    -e "s/__RELATIVE_PATH__/$(escape_sed_replacement "$relative_path")/g" \
    -e "s/__PARENT__/$(escape_sed_replacement "$parent_label")/g" \
    "$template_path"
}

is_path_inside() {
  root_path=$1
  candidate_path=$2
  case "$candidate_path" in
    "$root_path"/*|"$root_path") return 0 ;;
    *) return 1 ;;
  esac
}

relative_or_absolute() {
  absolute_path=$1
  if is_path_inside "$workspace_root" "$absolute_path"; then
    printf '%s\n' "${absolute_path#$workspace_root/}"
  else
    printf '%s\n' "$absolute_path"
  fi
}

should_skip_dir() {
  candidate=$1
  base=$(basename "$candidate")

  case "$base" in
    .git|.next|.nuxt|.astro|.turbo|.cache|cache|coverage|dist|build|out|node_modules|vendor)
      return 0
      ;;
    .* )
      return 0
      ;;
    * )
      return 1
      ;;
  esac
}

write_agents_file() {
  output_path=$1
  template_path=$2
  title=$3
  relative_path=$4
  parent_label=$5

  if [ -f "$output_path" ] && [ "$force" != "true" ]; then
    printf 'skip    %s\n' "$output_path"
    return 0
  fi

  mkdir -p "$(dirname "$output_path")"
  render_template "$template_path" "$title" "$relative_path" "$parent_label" >"$output_path"
  printf 'write   %s\n' "$output_path"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --force)
      force="true"
      shift
      ;;
    --max-depth)
      shift
      if [ $# -eq 0 ]; then
        usage >&2
        exit 1
      fi
      max_depth=$1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      target_dir=$1
      shift
      ;;
  esac
done

case "$max_depth" in
  ''|*[!0-9]*)
    printf 'max depth must be a non-negative integer.\n' >&2
    exit 1
    ;;
esac

if [ ! -f "$repo_template" ] || [ ! -f "$folder_template" ]; then
  printf 'AGENTS templates are missing under tools/templates/agents-md/.\n' >&2
  exit 1
fi

root_dir=$(CDPATH= cd -- "$target_dir" && pwd)
root_relative=$(relative_or_absolute "$root_dir")
root_name=$(basename "$root_dir")

printf 'Scaffolding AGENTS tree\n'
printf 'Root: %s\n' "$root_dir"
printf 'Depth: %s\n\n' "$max_depth"

write_agents_file "$root_dir/AGENTS.md" "$repo_template" "$root_name" "$root_relative" "(root)"

find "$root_dir" -type d | LC_ALL=C sort | while IFS= read -r directory; do
  [ "$directory" = "$root_dir" ] && continue

  if should_skip_dir "$directory"; then
    continue
  fi

  relative_to_root=${directory#$root_dir/}
  depth=$(printf '%s' "$relative_to_root" | awk -F/ '{print NF}')

  if [ "$depth" -gt "$max_depth" ]; then
    continue
  fi

  relative_path=$(relative_or_absolute "$directory")
  parent_path=$(dirname "$relative_path")
  if [ "$parent_path" = "." ]; then
    parent_path="$root_relative"
  fi

  write_agents_file \
    "$directory/AGENTS.md" \
    "$folder_template" \
    "$(basename "$directory")" \
    "$relative_path" \
    "$parent_path/AGENTS.md"
done
