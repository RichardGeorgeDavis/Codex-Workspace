#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: tools/scripts/context-catalog.sh [--run] [--print] [--output <relative-path>] <repo-path>

Preview or create a tracked, human-reviewable context catalog for a repository.
The default is a dry run. Existing catalog systems are detected and preserved.
EOF
}

run=0
print_catalog=0
output=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --run) run=1; shift ;;
    --print) print_catalog=1; shift ;;
    --output)
      [ "$#" -ge 2 ] || { echo "Missing value for --output" >&2; exit 2; }
      output="$2"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    --*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    *)
      [ -z "${repo_arg:-}" ] || { echo "Only one repository path is allowed" >&2; exit 2; }
      repo_arg="$1"
      shift
      ;;
  esac
done

[ -n "${repo_arg:-}" ] || { usage >&2; exit 2; }
[ -d "$repo_arg" ] || { echo "Repository does not exist: $repo_arg" >&2; exit 1; }

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
workspace_root="$(cd "$script_dir/../.." && pwd -P)"
repos_root="$(cd "$workspace_root/repos" && pwd -P)"
repo_path="$(cd "$repo_arg" && pwd -P)"

case "$repo_path/" in
  "$repos_root/"*) ;;
  *) echo "Repository must resolve inside $repos_root: $repo_path" >&2; exit 1 ;;
esac

existing_catalog=""
for candidate in \
  "CONTEXT_CATALOG.md" \
  "docs/CONTEXT_CATALOG.md" \
  "00-ai-context/CONTEXT_CATALOG.md" \
  "library/_catalog/index.md"
do
  if [ -f "$repo_path/$candidate" ]; then
    existing_catalog="$candidate"
    break
  fi
done

if [ -n "$existing_catalog" ]; then
  echo "Existing context catalog: $existing_catalog"
  echo "No files changed. Review and maintain the existing catalog instead of creating a duplicate."
  exit 0
fi

if [ -z "$output" ]; then
  if [ -d "$repo_path/00-ai-context" ]; then
    output="00-ai-context/CONTEXT_CATALOG.md"
  elif [ -d "$repo_path/library/_catalog" ]; then
    output="library/_catalog/context-catalog.md"
  elif [ -d "$repo_path/docs" ]; then
    output="docs/CONTEXT_CATALOG.md"
  else
    output="CONTEXT_CATALOG.md"
  fi
fi

target_path="$(python3 - "$repo_path" "$output" <<'PY'
from pathlib import Path
import sys

repo = Path(sys.argv[1]).resolve()
requested = Path(sys.argv[2])
if requested.is_absolute():
    raise SystemExit("--output must be relative to the repository")
target = (repo / requested).resolve()
try:
    target.relative_to(repo)
except ValueError:
    raise SystemExit("Catalog output must remain inside the repository")
if target.suffix.lower() != ".md":
    raise SystemExit("Catalog output must be a Markdown file")
print(target)
PY
)"

[ ! -e "$target_path" ] || { echo "Refusing to overwrite existing file: $target_path" >&2; exit 1; }

mode="dry-run"
[ "$run" -eq 1 ] && mode="apply"
echo "Repository: $repo_path"
echo "Catalog target: ${target_path#"$repo_path/"}"
echo "Mode: $mode"

python3 - "$repo_path" "$target_path" "$run" "$print_catalog" <<'PY'
from __future__ import annotations

import json
import os
from pathlib import Path
import sys

repo = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2]).resolve()
apply = sys.argv[3] == "1"
show = sys.argv[4] == "1"

project_name = repo.name
manifest = repo / ".workspace/project.json"
if manifest.is_file():
    try:
        project_name = json.loads(manifest.read_text(encoding="utf-8")).get("name") or project_name
    except (OSError, ValueError, TypeError):
        pass

candidates = [
    "00-control/NEW_CHAT_START.md", "NEW_CHAT_START.md", "START-HERE.md",
    "00-control/STATUS.md", "STATUS.md", "00-control/HANDOVER.md", "HANDOVER.md",
    "system/docs/HANDOVER.md", "README.md", "AGENTS.md", "AGENT.md", "WORKSPACE.md",
    ".workspace/project.json", "CONTEXT.md", "DESIGN.md", "docs/README.md",
    "library/README.md", "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
]
found = [item for item in candidates if (repo / item).is_file()]

def first(*items: str) -> str | None:
    return next((item for item in items if item in found), None)

def link(item: str) -> str:
    relative = os.path.relpath(repo / item, target.parent).replace(os.sep, "/")
    return f"[`{item}`]({relative})"

start = first("00-control/NEW_CHAT_START.md", "NEW_CHAT_START.md", "START-HERE.md", "README.md")
state = first("00-control/STATUS.md", "STATUS.md", "00-control/HANDOVER.md", "HANDOVER.md", "system/docs/HANDOVER.md")
rules = first("AGENTS.md", "AGENT.md", "WORKSPACE.md")
runtime = first(".workspace/project.json", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "README.md")
detail = first("CONTEXT.md", "library/README.md", "docs/README.md", "README.md")

startup = []
if start:
    startup.append((start, "project entry point"))
startup.append((target.name, "task router and folder wiki"))
if state and state != start:
    startup.append((state, "current state and handover"))
if rules and rules not in {start, state}:
    startup.append((rules, "agent rules when the task changes files"))

rows: list[tuple[str, str, str]] = []
if start:
    rows.append(("Understand the repository", "#start #overview", start))
if state:
    rows.append(("Find current work, blockers, or next steps", "#status #handover", state))
if rules:
    rows.append(("Check editing and safety rules", "#rules #agents", rules))
if runtime:
    rows.append(("Run, install, preview, or inspect runtime metadata", "#runtime #setup", runtime))
if detail and detail not in {start, state, rules, runtime}:
    rows.append(("Find deeper domain or documentation context", "#docs #context", detail))
if (repo / "test").is_dir() or (repo / "tests").is_dir():
    test_dir = "test" if (repo / "test").is_dir() else "tests"
    rows.append(("Locate verification coverage", "#tests #verification", test_dir))

excluded_dirs = {
    ".git", ".next", ".cache", "node_modules", "dist", "build", "cache",
    "coverage", "graphify-out", "vendor", "tmp", "temp",
}
directories = sorted(
    item.name for item in repo.iterdir()
    if item.is_dir() and not item.name.startswith(".") and item.name not in excluded_dirs
)

def purpose(name: str) -> str:
    lower = name.lower()
    if lower in {"app", "src", "server", "components", "lib", "scripts"}:
        return "Implementation or runtime code; open only for relevant code tasks."
    if lower in {"test", "tests", "spec", "specs"}:
        return "Verification coverage and fixtures."
    if lower in {"docs", "00-control", "system"}:
        return "Tracked guidance, status, decisions, or operating records."
    if lower in {"library", "knowledge", "catalog"}:
        return "Curated knowledge or canonical content; use its local indexes first."
    if lower in {"public", "assets", "media", "images"}:
        return "Assets or published files; do not load broadly into chat."
    if lower in {"ref", "refs", "reference", "references", "archive", "archives", "backups"}:
        return "Reference or historical material; open only with a specific evidence need."
    if lower in {"data", "content", "input", "inputs", "output", "outputs", "exports", "reports"}:
        return "Content, data, or process artifacts; inspect narrowly and check local authority rules."
    return "Review only when the current task requires this area."

lines = [
    f"# {project_name} Context Catalog", "", "## Purpose", "",
    "Use this tracked catalog as a low-token task router. It points to the smallest likely",
    "authoritative files; it does not replace source, manifests, status records, or handovers.", "",
    "> Review required: this scaffold is based on repository structure. Refine the task",
    "> routes and authority order after comparing them with the repository's actual workflow.", "",
    "## Minimal chat startup", "",
]
for index, (item, reason) in enumerate(startup, 1):
    rendered = f"`{target.name}`" if item == target.name else link(item)
    lines.append(f"{index}. Open {rendered} for the {reason}.")
lines.extend([
    "", "Then use the task router below before opening broad folders or historical material.", "",
    "## Search tags", "",
    "`#start` `#status` `#handover` `#rules` `#runtime` `#setup` `#docs` `#context` `#tests` `#verification`",
    "", "## Task router", "", "| Question or task | Search tags | Open first |", "| --- | --- | --- |",
])
if rows:
    for question, tags, item in rows:
        rendered = f"`{item}/`" if (repo / item).is_dir() else link(item)
        lines.append(f"| {question} | `{tags}` | {rendered} |")
else:
    lines.append("| Establish the repository's authority order | `#start #review` | Review root files and replace this row |")
lines.extend(["", "## Folder wiki", "", "Paths below are repository-root-relative.", "", "| Folder | Intended use |", "| --- | --- |"])
if directories:
    for directory in directories:
        lines.append(f"| `{directory}/` | {purpose(directory)} |")
else:
    lines.append("| `(no visible top-level folders)` | Add routes as the repository structure develops. |")
lines.extend([
    "", "## Token discipline", "",
    "- Search this catalog before opening broad context.",
    "- Open only the files routed for the current task, then verify claims against authoritative source.",
    "- Do not preload archives, references, media, generated output, caches, lockfiles, or large data payloads.",
    "- Use generated context-cache summaries only as disposable side-loads, never as canonical records.",
    "- Add a route instead of copying source content into this catalog.",
    "", "## Maintenance", "",
    "Update this catalog when canonical files move, authority order changes, or a repeated task lacks",
    "a precise route. Keep entries short and link-based. Current status remains in the repository's",
    "status or handover files, not here.", "",
])
content = "\n".join(lines)

print(f"Detected startup/reference files: {len(found)}")
if show:
    print("--- catalog preview ---")
    print(content, end="")
if apply:
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(target)
    print(f"Created: {target}")
else:
    print("Dry run only. Re-run with --run to create the catalog.")
PY
