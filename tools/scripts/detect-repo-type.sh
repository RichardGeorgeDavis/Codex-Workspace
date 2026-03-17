#!/usr/bin/env sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

read_manifest_field() {
  field_name=$1
  manifest_path=$2

  if [ ! -f "$manifest_path" ]; then
    return 1
  fi

  if command -v jq >/dev/null 2>&1; then
    jq -r --arg field "$field_name" '.[$field] // empty' "$manifest_path"
    return 0
  fi

  return 1
}

has_match() {
  pattern=$1
  file_path=$2

  if [ ! -f "$file_path" ]; then
    return 1
  fi

  if command -v rg >/dev/null 2>&1; then
    rg -q "$pattern" "$file_path"
    return $?
  fi

  grep -Eq "$pattern" "$file_path"
}

repo_dir=${1:-.}
repo_dir=$(CDPATH= cd -- "$repo_dir" && pwd)
manifest_path="$repo_dir/.workspace/project.json"

manifest_type=$(read_manifest_field type "$manifest_path" 2>/dev/null || true)
manifest_mode=$(read_manifest_field preferredMode "$manifest_path" 2>/dev/null || true)
manifest_package_manager=$(read_manifest_field packageManager "$manifest_path" 2>/dev/null || true)

package_manager=""
type=""
preferred_mode=""
detected_by="files"

if [ -f "$repo_dir/pnpm-lock.yaml" ]; then
  package_manager="pnpm"
elif [ -f "$repo_dir/yarn.lock" ]; then
  package_manager="yarn"
elif [ -f "$repo_dir/package-lock.json" ] || [ -f "$repo_dir/npm-shrinkwrap.json" ]; then
  package_manager="npm"
elif [ -f "$repo_dir/composer.lock" ] || [ -f "$repo_dir/composer.json" ]; then
  package_manager="composer"
fi

if [ -n "$manifest_package_manager" ]; then
  package_manager="$manifest_package_manager"
fi

if [ -n "$manifest_type" ]; then
  type="$manifest_type"
  detected_by="manifest"
fi

if [ -z "$type" ]; then
  if [ -f "$repo_dir/wp-config.php" ] || [ -d "$repo_dir/wp-content" ] || [ -d "$repo_dir/wp-includes" ]; then
    type="wordpress"
  elif [ "${repo_dir#*/repos/wordpress/}" != "$repo_dir" ]; then
    type="wordpress"
  elif find "$repo_dir" -maxdepth 1 -type f -name 'vite.config.*' | grep -q .; then
    if has_match '"three"|@react-three/fiber|@react-three/drei' "$repo_dir/package.json"; then
      type="threejs"
    else
      type="vite"
    fi
  elif has_match '"three"|@react-three/fiber|@react-three/drei' "$repo_dir/package.json"; then
    type="threejs"
  elif [ -f "$repo_dir/package.json" ]; then
    type="node-app"
  elif [ -f "$repo_dir/composer.json" ] && { [ -f "$repo_dir/index.php" ] || [ -f "$repo_dir/public/index.php" ]; }; then
    type="php"
  elif [ -f "$repo_dir/index.html" ]; then
    type="static"
  else
    type="other"
  fi
fi

if [ -n "$manifest_mode" ]; then
  preferred_mode="$manifest_mode"
fi

if [ -z "$preferred_mode" ]; then
  case "$type" in
    wordpress) preferred_mode="external" ;;
    static|vite|threejs|node-app|php) preferred_mode="direct" ;;
    *) preferred_mode="direct" ;;
  esac
fi

printf '{\n'
printf '  "path": "%s",\n' "$(json_escape "$repo_dir")"
printf '  "type": "%s",\n' "$(json_escape "$type")"
printf '  "packageManager": "%s",\n' "$(json_escape "$package_manager")"
printf '  "preferredMode": "%s",\n' "$(json_escape "$preferred_mode")"
printf '  "manifestPath": "%s",\n' "$(json_escape "$manifest_path")"
printf '  "detectedBy": "%s"\n' "$(json_escape "$detected_by")"
printf '}\n'
