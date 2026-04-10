#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
CACHE_CONTEXT_ROOT="$WORKSPACE_ROOT/cache/context"
GENERATOR_PATH="tools/scripts/generate-context-cache.sh"

MODE=""
TARGET_REPO=""
PRINT_OUTPUT=0
RUN_MODE=0

usage() {
  cat <<'EOF'
Usage:
  generate-context-cache.sh --workspace [--print] [--run]
  generate-context-cache.sh --repo <repo-name> [--print] [--run]

Generate compact side-load context files under cache/context/.
Dry-run by default. Use --run to write files.

Options:
  --workspace         Generate workspace summaries
  --repo <repo-name>  Generate summaries for a repo name under repos/
  --print             Print generated content to stdout
  --run               Write generated files under cache/context/
  --help, -h          Show this help
EOF
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

trim_text() {
  local limit="$1"
  python3 - "$limit" <<'PY'
import sys

limit = int(sys.argv[1])
text = sys.stdin.read().strip()
text = "\n".join(line.rstrip() for line in text.splitlines()).strip()

if len(text) <= limit:
    print(text)
else:
    clipped = text[:limit].rsplit(" ", 1)[0].strip()
    print(f"{clipped} …")
PY
}

extract_bullets() {
  local file="$1"
  local max_lines="$2"
  python3 - "$file" "$max_lines" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
max_lines = int(sys.argv[2])
text = path.read_text(encoding="utf-8", errors="ignore")
lines = [line.rstrip() for line in text.splitlines()]
items = []

for line in lines:
    stripped = line.strip()
    if not stripped:
        continue
    if stripped.startswith("#"):
        items.append(stripped.lstrip("# ").strip())
    elif re.match(r"^[-*] ", stripped):
        items.append(stripped[2:].strip())
    elif re.match(r"^\d+\. ", stripped):
        items.append(re.sub(r"^\d+\.\s+", "", stripped).strip())
    if len(items) >= max_lines:
        break

print("\n".join(items))
PY
}

require_file() {
  local target="$1"
  [[ -f "$target" ]] || die "Missing required source file: $target"
}

ensure_safe_repo_name() {
  local repo_name="$1"
  [[ -n "$repo_name" ]] || die "A repo name is required."
  [[ "$repo_name" != *"/"* ]] || die "Repo names must not contain path separators."
  [[ "$repo_name" != "." && "$repo_name" != ".." ]] || die "Repo name is not valid."
}

resolve_repo_path() {
  local repo_name="$1"
  ensure_safe_repo_name "$repo_name"

  local repos_root="$WORKSPACE_ROOT/repos"
  [[ -d "$repos_root" ]] || die "Missing repos directory: $repos_root"

  local matches=()
  while IFS= read -r match; do
    matches+=("$match")
  done < <(find "$repos_root" -mindepth 1 -maxdepth 2 -type d -name "$repo_name" | sort)

  if [[ "${#matches[@]}" -eq 0 ]]; then
    die "No repo named '$repo_name' was found under repos/."
  fi

  if [[ "${#matches[@]}" -gt 1 ]]; then
    printf 'Error: Repo name %s is ambiguous:\n' "$repo_name" >&2
    printf '  - %s\n' "${matches[@]}" >&2
    exit 1
  fi

  printf '%s\n' "${matches[0]}"
}

workspace_relative_path() {
  python3 - "$WORKSPACE_ROOT" "$1" <<'PY'
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
print(target.relative_to(root).as_posix())
PY
}

render_workspace_abstract() {
  cat <<'EOF'
# Codex Workspace — abstract

Codex Workspace is a local-first mixed-repo workspace designed to keep unrelated repositories independently runnable instead of forcing a monorepo dependency model.

Primary entrypoints are the root `README.md`, the first-run guide in `docs/08-first-run-and-updates.md`, and Workspace Hub in `repos/workspace-hub/`.

Runtime stance: share caches under `cache/`, keep installs repo-local, prefer direct local previews for frontend-style repos, and keep existing WordPress flows pragmatic and external where that already works.

Constraint: side-load files under `cache/context/` are generated convenience summaries only and never override tracked docs, manifests, or repo files.
EOF
}

render_workspace_overview() {
  local readme_points agents_points context_points first_run_points baseline_points hub_points
  readme_points="$(extract_bullets "$WORKSPACE_ROOT/README.md" 6 | trim_text 900)"
  agents_points="$(extract_bullets "$WORKSPACE_ROOT/AGENTS.md" 6 | trim_text 800)"
  context_points="$(extract_bullets "$WORKSPACE_ROOT/docs/07-context-cache-and-retrieval.md" 6 | trim_text 800)"
  first_run_points="$(extract_bullets "$WORKSPACE_ROOT/docs/08-first-run-and-updates.md" 6 | trim_text 800)"
  baseline_points="$(extract_bullets "$WORKSPACE_ROOT/docs/09-new-repo-baseline.md" 5 | trim_text 700)"
  hub_points="$(extract_bullets "$WORKSPACE_ROOT/repos/workspace-hub/README.md" 5 | trim_text 700)"

  cat <<EOF
# Codex Workspace — overview

## What it is

Codex Workspace is a mixed-stack local workspace built around explicit runtime behavior, workspace-level caches, lightweight manifests, and a concrete control-plane app in repos/workspace-hub/.

## Main directories

- docs/ holds the canonical workspace documentation pack.
- repos/ holds independently runnable child repos.
- tools/ holds shared scripts, wrappers, templates, and capability management.
- cache/ holds disposable generated artifacts such as context summaries and browser caches.
- shared/ holds workspace-facing metadata and durable per-user service state.

## Commands and entrypoints

$first_run_points

## Workspace rules

$agents_points

## Context-loading rules

$context_points

## Repo-intake defaults

$baseline_points

## Current concrete product

$hub_points

## High-signal workspace notes

$readme_points

## Open next when needed

- README.md for the public workspace entry path.
- docs/07-context-cache-and-retrieval.md for the layered cache model.
- docs/08-first-run-and-updates.md for setup and operational commands.
- docs/09-new-repo-baseline.md for repo-intake defaults.
- repos/workspace-hub/README.md for the current app surface.
EOF
}

render_repo_abstract() {
  cat <<'EOF'
# Workspace Hub — abstract

Workspace Hub is the concrete product inside Codex Workspace: a local dashboard that discovers sibling repos, shows runtime and metadata state, and provides open, preview, install, and run controls without centralizing repo installs.

Primary entrypoint: repos/workspace-hub/README.md, with local runtime from pnpm dev inside the repo.

Runtime stance: the app treats the workspace as a filesystem-first mixed-stack environment, keeps repo behavior explicit, and uses cached summary reads only as an optional aid.

Constraint: the Hub must keep base-summary refreshes cheap, so repo side-load metadata is only hydrated on repo-detail reads rather than every workspace summary request.
EOF
}

render_repo_overview() {
  local readme_points repo_agents repo_manifest
  readme_points="$(extract_bullets "$REPO_ROOT/README.md" 8 | trim_text 1200)"

  if [[ -f "$REPO_ROOT/AGENTS.md" ]]; then
    repo_agents="$(extract_bullets "$REPO_ROOT/AGENTS.md" 5 | trim_text 700)"
  else
    repo_agents="No repo-local AGENTS.md file is present."
  fi

  if [[ -f "$REPO_ROOT/.workspace/project.json" ]]; then
    repo_manifest="$(python3 - "$REPO_ROOT/.workspace/project.json" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
try:
    data = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    print("Repo manifest exists but could not be parsed.")
    raise SystemExit(0)

summary = []
for key in ("name", "type", "preferredMode", "devCommand", "previewUrl"):
    value = data.get(key)
    if value:
        summary.append(f"{key}: {value}")

print("\n".join(summary) if summary else "Repo manifest exists with no high-signal fields set.")
PY
)"
  else
    repo_manifest="No repo-local `.workspace/project.json` manifest is present."
  fi

  cat <<EOF
# Workspace Hub — overview

## What it is

Workspace Hub is the local control centre for Codex Workspace. It scans sibling repos, classifies them conservatively, hydrates repo details on demand, and keeps direct local runtime as the default path where that fits.

## Main commands

- pnpm install
- pnpm dev
- pnpm test
- pnpm typecheck
- pnpm lint
- pnpm build

## Runtime assumptions

- Node.js 20+ and pnpm 9+ are the expected local baseline.
- WORKSPACE_HUB_WORKSPACE_ROOT can point at a different workspace root when needed.
- Base summary requests should stay cheap; deeper repo detail is loaded through GET /api/repos/details.
- Generated side-load cache files are read-only hints and do not replace tracked repo docs or manifests.

## High-signal repo points

$readme_points

## Repo-local agent guidance

$repo_agents

## Repo manifest

$repo_manifest

## Open next when needed

- repos/workspace-hub/README.md for product behavior and verification commands.
- repos/workspace-hub/docs/INSTRUCTIONS.md for repo-local documentation guidance.
- docs/03-workspace-hub-build-spec.md for the broader build direction.
- docs/07-context-cache-and-retrieval.md and docs/20-ai-context-side-load.md for the context-cache contract.
EOF
}

build_sources_json() {
  local scope="$1"
  local target="$2"
  local generated_at="$3"
  local inputs_spec="$4"
  local outputs_spec="$5"

  python3 - "$WORKSPACE_ROOT" "$scope" "$target" "$generated_at" "$GENERATOR_PATH" "$inputs_spec" "$outputs_spec" <<'PY'
import hashlib
import json
import os
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
scope = sys.argv[2]
target = sys.argv[3]
generated_at = sys.argv[4]
generator_path = sys.argv[5]
inputs_spec = sys.argv[6]
outputs_spec = sys.argv[7]

def parse_items(spec: str):
    items = []
    for line in spec.splitlines():
        line = line.strip()
        if not line:
            continue
        path, role = line.split("|", 1)
        items.append((path, role))
    return items

inputs = []
for rel_path, role in parse_items(inputs_spec):
    full_path = root / rel_path
    stat_result = full_path.stat()
    digest = hashlib.sha256(full_path.read_bytes()).hexdigest()
    inputs.append(
        {
            "path": rel_path,
            "role": role,
            "bytes": stat_result.st_size,
            "mtimeMs": stat_result.st_mtime_ns / 1_000_000,
            "sha256": digest,
        }
    )

outputs = [
    {"path": rel_path, "role": role}
    for rel_path, role in parse_items(outputs_spec)
]

payload = {
    "version": 1,
    "scope": scope,
    "target": target,
    "generatedAt": generated_at,
    "generator": {
        "path": generator_path,
    },
    "inputs": inputs,
    "outputs": outputs,
}

print(json.dumps(payload, indent=2))
PY
}

print_rendered_file() {
  local title="$1"
  local content="$2"
  printf '=== %s ===\n%s\n\n' "$title" "$content"
}

write_file() {
  local target="$1"
  local content="$2"
  mkdir -p "$(dirname "$target")"
  printf '%s\n' "$content" >"$target"
}

run_generation() {
  local scope="$1"
  local target="$2"
  local output_dir="$3"
  local abstract_content="$4"
  local overview_content="$5"
  local inputs_spec="$6"
  local outputs_spec="$7"
  local generated_at="$8"

  local abstract_rel overview_rel sources_rel
  abstract_rel="$(workspace_relative_path "$output_dir/abstract.md")"
  overview_rel="$(workspace_relative_path "$output_dir/overview.md")"
  sources_rel="$(workspace_relative_path "$output_dir/sources.json")"
  local sources_content
  sources_content="$(build_sources_json "$scope" "$target" "$generated_at" "$inputs_spec" "$outputs_spec")"

  if [[ "$RUN_MODE" -eq 1 ]]; then
    write_file "$output_dir/abstract.md" "$abstract_content"
    write_file "$output_dir/overview.md" "$overview_content"
    write_file "$output_dir/sources.json" "$sources_content"
    printf 'Wrote %s\n' "$abstract_rel"
    printf 'Wrote %s\n' "$overview_rel"
    printf 'Wrote %s\n' "$sources_rel"
  else
    printf '[plan] %s\n' "$abstract_rel"
    printf '[plan] %s\n' "$overview_rel"
    printf '[plan] %s\n' "$sources_rel"
  fi

  if [[ "$PRINT_OUTPUT" -eq 1 ]]; then
    print_rendered_file "$abstract_rel" "$abstract_content"
    print_rendered_file "$overview_rel" "$overview_content"
    print_rendered_file "$sources_rel" "$sources_content"
  fi
}

generate_workspace() {
  require_file "$WORKSPACE_ROOT/README.md"
  require_file "$WORKSPACE_ROOT/AGENTS.md"
  require_file "$WORKSPACE_ROOT/docs/07-context-cache-and-retrieval.md"
  require_file "$WORKSPACE_ROOT/docs/08-first-run-and-updates.md"
  require_file "$WORKSPACE_ROOT/docs/09-new-repo-baseline.md"
  require_file "$WORKSPACE_ROOT/repos/workspace-hub/README.md"

  local output_dir="$CACHE_CONTEXT_ROOT/workspace"
  local abstract_content overview_content generated_at inputs_spec outputs_spec
  generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  abstract_content="$(render_workspace_abstract)"
  overview_content="$(render_workspace_overview)"
  inputs_spec=$'README.md|workspace-readme\nAGENTS.md|workspace-agents\ndocs/07-context-cache-and-retrieval.md|context-model\ndocs/08-first-run-and-updates.md|first-run-guide\ndocs/09-new-repo-baseline.md|repo-baseline\nrepos/workspace-hub/README.md|workspace-hub-readme'
  outputs_spec=$'cache/context/workspace/abstract.md|abstract\ncache/context/workspace/overview.md|overview\ncache/context/workspace/sources.json|sources'

  run_generation "workspace" "workspace" "$output_dir" "$abstract_content" "$overview_content" "$inputs_spec" "$outputs_spec" "$generated_at"
}

generate_repo() {
  REPO_ROOT="$(resolve_repo_path "$TARGET_REPO")"
  require_file "$REPO_ROOT/README.md"

  local repo_relative
  repo_relative="$(workspace_relative_path "$REPO_ROOT")"
  local output_dir="$CACHE_CONTEXT_ROOT/repos/$TARGET_REPO"
  local generated_at abstract_content overview_content inputs_spec outputs_spec
  generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  abstract_content="$(render_repo_abstract)"
  overview_content="$(render_repo_overview)"
  inputs_spec="$(printf '%s|repo-readme\n' "$repo_relative/README.md")"

  if [[ -f "$REPO_ROOT/AGENTS.md" ]]; then
    inputs_spec+=$'\n'"$(printf '%s|repo-agents' "$repo_relative/AGENTS.md")"
  fi

  if [[ -f "$REPO_ROOT/.workspace/project.json" ]]; then
    inputs_spec+=$'\n'"$(printf '%s|repo-manifest' "$repo_relative/.workspace/project.json")"
  fi

  outputs_spec="$(printf 'cache/context/repos/%s/abstract.md|abstract\ncache/context/repos/%s/overview.md|overview\ncache/context/repos/%s/sources.json|sources' "$TARGET_REPO" "$TARGET_REPO" "$TARGET_REPO")"

  run_generation "repo" "$TARGET_REPO" "$output_dir" "$abstract_content" "$overview_content" "$inputs_spec" "$outputs_spec" "$generated_at"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ -z "$MODE" ]] || die "Choose either --workspace or --repo."
      MODE="workspace"
      shift
      ;;
    --repo)
      [[ -z "$MODE" ]] || die "Choose either --workspace or --repo."
      [[ $# -ge 2 ]] || die "--repo requires a repo name."
      MODE="repo"
      TARGET_REPO="$2"
      shift 2
      ;;
    --print)
      PRINT_OUTPUT=1
      shift
      ;;
    --run)
      RUN_MODE=1
      shift
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

[[ -n "$MODE" ]] || {
  usage >&2
  exit 1
}

case "$MODE" in
  workspace)
    generate_workspace
    ;;
  repo)
    generate_repo
    ;;
esac
