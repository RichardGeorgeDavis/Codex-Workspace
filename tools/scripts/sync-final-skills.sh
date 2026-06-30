#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
target_rel="repos/current-builds/knowledge-foundry/process/input/_final-skills-here"
run_mode="dry-run"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--run]

Copy every discovered workspace skill folder into:
  $target_rel

Default behavior is a dry run. Use --run to apply changes.

The scanner looks for SKILL.md files under the workspace, skips generated,
released-pack, reference, cache, dependency, and destination folders, and deduplicates exact
skill copies. If two different skills resolve to the same name, the later copy
gets a source-path suffix so neither skill is lost.
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
  printf 'Node.js is required to scan and copy skill folders.\n' >&2
  exit 1
fi

node - "$workspace_root" "$target_rel" "$run_mode" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const workspaceRoot = process.argv[2];
const targetRel = process.argv[3];
const runMode = process.argv[4];
const targetRoot = path.resolve(workspaceRoot, targetRel);

const noiseFiles = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const pruneDirNames = new Set([
  ".git",
  ".hg",
  ".svn",
  ".cache",
  ".next",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "venv",
]);

const pruneRoots = [
  "cache",
  "docs/archive",
  "tools/ref",
  targetRel,
  "repos/current-builds/knowledge-foundry/process/input/skills",
  "repos/current-builds/knowledge-foundry/workspace/ref",
  "repos/current-builds/knowledge-foundry/workspace/references",
  "repos/current-builds/knowledge-foundry/workspace/cache",
  "repos/current-builds/knowledge-foundry/process/queue",
  "repos/current-builds/knowledge-foundry/knowledge/packs",
  "repos/current-builds/knowledge-foundry/knowledge/skills",
].map((value) => path.resolve(workspaceRoot, value));

function rel(absolute) {
  return path.relative(workspaceRoot, absolute).split(path.sep).join("/");
}

function isInsideOrSame(child, parent) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function isNoiseFile(name) {
  return noiseFiles.has(name) || name.startsWith("._") || name === "Icon\r";
}

function shouldPruneDir(dir) {
  if (pruneRoots.some((root) => isInsideOrSame(dir, root))) {
    return true;
  }
  return pruneDirNames.has(path.basename(dir));
}

function shouldPruneNestedDir(dir) {
  return pruneDirNames.has(path.basename(dir));
}

function slugify(value, fallback = "skill") {
  const slug = String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || fallback;
}

function parseSkillName(skillPath) {
  const text = fs.readFileSync(skillPath, "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatter) {
    return "";
  }

  for (const line of frontmatter[1].split(/\r?\n/)) {
    const match = line.match(/^name:\s*(.+?)\s*$/);
    if (match) {
      return match[1].replace(/^["']|["']$/g, "").trim();
    }
  }

  return "";
}

function walkFiles(dir) {
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!shouldPruneNestedDir(path.join(current, entry.name))) {
          walk(path.join(current, entry.name));
        }
        continue;
      }
      if (entry.isFile() && !isNoiseFile(entry.name)) {
        files.push(path.join(current, entry.name));
      }
    }
  }

  walk(dir);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function treeHash(dir) {
  const hash = createHash("sha256");
  for (const file of walkFiles(dir)) {
    hash.update(path.relative(dir, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function findSkillDirs() {
  const skillDirs = [];

  function walk(current) {
    if (shouldPruneDir(current)) {
      return;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "SKILL.md")) {
      skillDirs.push(current);
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name));
      }
    }
  }

  walk(workspaceRoot);
  return skillDirs.sort((a, b) => rel(a).localeCompare(rel(b)));
}

function priorityFor(dir) {
  const relative = rel(dir);
  if (relative.startsWith("shared/skills/")) return 10;
  if (relative.startsWith("tools/templates/skills/")) return 20;
  if (relative.startsWith("plugins/")) return 30;
  if (relative.includes("/.codex/skills/")) return 40;
  if (relative.includes("/.workspace/skills/")) return 50;
  if (relative.includes("/.agents/skills/")) return 60;
  if (relative.startsWith(".agents/skills/")) return 70;
  return 80;
}

function targetNameFor(skill, usedNames) {
  if (!usedNames.has(skill.baseName)) {
    usedNames.add(skill.baseName);
    return skill.baseName;
  }

  const suffix = slugify(`${rel(skill.dir)}-${skill.hash.slice(0, 8)}`, skill.hash.slice(0, 8));
  let candidate = `${skill.baseName}--${suffix}`;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${skill.baseName}--${suffix}-${index}`;
    index += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function copyDir(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  function copy(current, output) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const from = path.join(current, entry.name);
      const to = path.join(output, entry.name);

      if (entry.isDirectory()) {
        if (shouldPruneNestedDir(from)) {
          continue;
        }
        fs.mkdirSync(to, { recursive: true });
        copy(from, to);
        continue;
      }

      if (entry.isFile() && !isNoiseFile(entry.name)) {
        fs.copyFileSync(from, to);
      }
    }
  }

  copy(source, target);
}

const discovered = findSkillDirs().map((dir) => {
  const skillPath = path.join(dir, "SKILL.md");
  const skillName = parseSkillName(skillPath);
  return {
    dir,
    baseName: slugify(skillName || path.basename(dir)),
    hash: treeHash(dir),
    priority: priorityFor(dir),
  };
});

discovered.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return rel(a.dir).localeCompare(rel(b.dir));
});

const chosen = [];
const seenHashes = new Map();
for (const skill of discovered) {
  const previous = seenHashes.get(skill.hash);
  if (previous) {
    skill.duplicateOf = previous;
    continue;
  }
  seenHashes.set(skill.hash, skill);
  chosen.push(skill);
}

const usedNames = new Set();
for (const skill of chosen) {
  skill.targetName = targetNameFor(skill, usedNames);
  skill.target = path.join(targetRoot, skill.targetName);
  const exists = fs.existsSync(skill.target);
  const current = exists && fs.existsSync(path.join(skill.target, "SKILL.md"))
    ? treeHash(skill.target)
    : "";
  skill.action = current === skill.hash ? "same   " : exists ? "replace" : "add    ";
}

console.log(`Target: ${targetRel}`);
console.log(`Mode: ${runMode === "run" ? "apply" : "dry run"}`);
console.log(`Discovered: ${discovered.length}`);
console.log(`Unique: ${chosen.length}`);
console.log(`Duplicate copies skipped: ${discovered.length - chosen.length}`);

if (runMode === "run") {
  fs.mkdirSync(targetRoot, { recursive: true });
}

for (const skill of chosen.sort((a, b) => a.targetName.localeCompare(b.targetName))) {
  const from = rel(skill.dir);
  const to = rel(skill.target);
  if (runMode === "run" && skill.action !== "same   ") {
    copyDir(skill.dir, skill.target);
    console.log(`  synced  ${to} <- ${from}`);
  } else {
    console.log(`  ${skill.action} ${to} <- ${from}`);
  }
}

for (const skill of discovered.filter((item) => item.duplicateOf)) {
  console.log(`  skip    ${rel(skill.dir)} duplicates ${rel(skill.duplicateOf.dir)}`);
}
NODE
