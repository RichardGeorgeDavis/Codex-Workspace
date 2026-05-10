#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
manifest_path="$workspace_root/tools/manifests/tomevault-skills.json"
run_mode="dry-run"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run]

Mirror the manifest-managed SKILL.md source directories into .agents/skills/
for TomeVault distribution.

Default behavior is a dry run. Use --run to apply changes.
Only targets listed in tools/manifests/tomevault-skills.json are replaced.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run)
      run_mode="run"
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

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is required to parse %s\n' "$manifest_path" >&2
  exit 1
fi

node - "$workspace_root" "$manifest_path" "$run_mode" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const workspaceRoot = process.argv[2];
const manifestPath = process.argv[3];
const runMode = process.argv[4];

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedTargetRootRel = ".agents/skills";
const targetRootRel = manifest.targetRoot || expectedTargetRootRel;
const targetRoot = path.resolve(workspaceRoot, targetRootRel);
const expectedTargetRoot = path.resolve(workspaceRoot, expectedTargetRootRel);

function rel(p) {
  return path.relative(workspaceRoot, p).split(path.sep).join("/");
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isInsideOrSame(child, parent) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function resolveWorkspacePath(value, label) {
  if (!value || typeof value !== "string" || path.isAbsolute(value)) {
    throw new Error(`${label} must be a relative workspace path.`);
  }

  const absolute = path.resolve(workspaceRoot, value);
  if (!isInsideOrSame(absolute, workspaceRoot)) {
    throw new Error(`${label} must stay inside the workspace: ${value}`);
  }

  return absolute;
}

function treeHash(dir) {
  const hash = createHash("sha256");
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  walk(dir);
  files.sort((a, b) => rel(a).localeCompare(rel(b)));

  for (const file of files) {
    hash.update(path.relative(dir, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }

  return hash.digest("hex");
}

if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
  throw new Error("Manifest must contain at least one skill entry.");
}

if (targetRoot !== expectedTargetRoot) {
  throw new Error(`targetRoot must be ${expectedTargetRootRel} for TomeVault sync.`);
}

const skills = [...manifest.skills].sort((a, b) =>
  String(a.name).localeCompare(String(b.name)),
);

console.log(`Manifest: ${rel(manifestPath)}`);
console.log(`Target root: ${targetRootRel}`);
console.log(`Mode: ${runMode === "run" ? "apply" : "dry run"}`);

for (const skill of skills) {
  if (!skill || typeof skill !== "object") {
    throw new Error("Each skill entry must be an object.");
  }
  if (!skill.name || !skill.source) {
    throw new Error("Each skill entry needs name and source fields.");
  }

  const source = resolveWorkspacePath(skill.source, `${skill.name} source`);
  const target = resolveWorkspacePath(
    skill.target || path.join(targetRootRel, skill.name),
    `${skill.name} target`,
  );

  if (!isInside(target, targetRoot)) {
    throw new Error(`Refusing target outside ${targetRootRel}: ${skill.target}`);
  }
  if (!fs.existsSync(path.join(source, "SKILL.md"))) {
    throw new Error(`Missing source SKILL.md for ${skill.name}: ${rel(source)}`);
  }

  const exists = fs.existsSync(target);
  const isCurrent = exists && treeHash(source) === treeHash(target);
  const action = isCurrent ? "same   " : exists ? "replace" : "add    ";
  if (runMode !== "run") {
    console.log(`  ${action} ${rel(target)} <- ${rel(source)}`);
    continue;
  }

  if (isCurrent) {
    console.log(`  same    ${rel(target)} <- ${rel(source)}`);
    continue;
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  console.log(`  synced  ${rel(target)} <- ${rel(source)}`);
}
NODE
