import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const sourceScriptPath = path.join(workspaceRoot, 'tools', 'scripts', 'generate-context-cache.sh')

let tempWorkspaceRoot = ''

async function writeText(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

async function setupWorkspaceFixture(root: string) {
  for (const directory of ['cache', 'docs', 'repos/workspace-hub', 'shared', 'tools/scripts']) {
    await mkdir(path.join(root, directory), { recursive: true })
  }

  await writeText(path.join(root, 'README.md'), '# Codex Workspace\n- Workspace Hub\n- cache/context/\n')
  await writeText(path.join(root, 'AGENTS.md'), '# AGENTS\n- Share caches, not installs.\n')
  await writeText(
    path.join(root, 'docs', '07-context-cache-and-retrieval.md'),
    '# Context\n- L0 abstract\n- L1 overview\n- cache/context/\n',
  )
  await writeText(
    path.join(root, 'docs', '08-first-run-and-updates.md'),
    '# First run\n- cd repos/workspace-hub\n- pnpm dev\n',
  )
  await writeText(
    path.join(root, 'docs', '09-new-repo-baseline.md'),
    '# New repo baseline\n- classify cautiously\n- default frontend repos to direct\n',
  )
  await writeText(
    path.join(root, 'repos', 'workspace-hub', 'README.md'),
    '# Workspace Hub\n- pnpm install\n- pnpm dev\n- repo details\n',
  )
  await writeText(
    path.join(root, 'repos', 'workspace-hub', 'AGENTS.md'),
    '# Repo AGENTS\n- Prefer explicit process handling.\n',
  )
  await writeText(
    path.join(root, 'repos', 'workspace-hub', '.workspace', 'project.json'),
    JSON.stringify(
      {
        name: 'Workspace Hub',
        preferredMode: 'direct',
        type: 'node-app',
      },
      null,
      2,
    ),
  )
  const targetScriptPath = path.join(root, 'tools', 'scripts', 'generate-context-cache.sh')
  await writeFile(targetScriptPath, await readFile(sourceScriptPath), 'utf8')
  await chmod(targetScriptPath, 0o755)
}

async function runScript(root: string, args: string[]) {
  return execFileAsync(path.join(root, 'tools', 'scripts', 'generate-context-cache.sh'), args, {
    cwd: root,
    env: process.env,
  })
}

before(async () => {
  tempWorkspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codex-workspace-side-load-'))
  await setupWorkspaceFixture(tempWorkspaceRoot)
})

after(async () => {
  if (tempWorkspaceRoot) {
    await rm(tempWorkspaceRoot, { force: true, recursive: true })
  }
})

test('generate-context-cache.sh supports dry-run printing without writing files', async () => {
  const { stdout } = await runScript(tempWorkspaceRoot, ['--workspace', '--print'])

  assert.match(stdout, /\[plan\] cache\/context\/workspace\/abstract\.md/)
  assert.match(stdout, /=== cache\/context\/workspace\/overview\.md ===/)
  await assert.rejects(
    stat(path.join(tempWorkspaceRoot, 'cache', 'context', 'workspace', 'abstract.md')),
  )
})

test('generate-context-cache.sh writes workspace and repo side-load files with provenance', async () => {
  await runScript(tempWorkspaceRoot, ['--workspace', '--run'])
  await runScript(tempWorkspaceRoot, ['--repo', 'workspace-hub', '--run'])

  const workspaceSources = JSON.parse(
    await readFile(path.join(tempWorkspaceRoot, 'cache', 'context', 'workspace', 'sources.json'), 'utf8'),
  ) as {
    generatedAt: string
    inputs: Array<{ bytes: number; mtimeMs: number; path: string; role: string; sha256: string }>
    outputs: Array<{ path: string; role: string }>
    scope: string
    target: string
  }
  const repoSources = JSON.parse(
    await readFile(
      path.join(tempWorkspaceRoot, 'cache', 'context', 'repos', 'workspace-hub', 'sources.json'),
      'utf8',
    ),
  ) as {
    inputs: Array<{ path: string; role: string; sha256: string }>
    outputs: Array<{ path: string; role: string }>
    scope: string
    target: string
  }

  assert.equal(workspaceSources.scope, 'workspace')
  assert.equal(workspaceSources.target, 'workspace')
  assert.ok(workspaceSources.generatedAt)
  assert.equal(workspaceSources.inputs.length, 6)
  assert.ok(workspaceSources.inputs.every((entry) => entry.bytes >= 0 && entry.mtimeMs > 0 && entry.sha256.length > 0))
  assert.deepEqual(
    workspaceSources.outputs.map((entry) => entry.role),
    ['abstract', 'entry', 'overview', 'sources'],
  )

  assert.equal(repoSources.scope, 'repo')
  assert.equal(repoSources.target, 'workspace-hub')
  assert.deepEqual(
    repoSources.inputs.map((entry) => entry.role).sort(),
    ['repo-agents', 'repo-manifest', 'repo-readme'],
  )
  assert.deepEqual(
    repoSources.outputs.map((entry) => entry.path),
    [
      'cache/context/repos/workspace-hub/abstract.md',
      'cache/context/repos/workspace-hub/entry.md',
      'cache/context/repos/workspace-hub/overview.md',
      'cache/context/repos/workspace-hub/sources.json',
    ],
  )
})

test('generate-context-cache.sh rejects unsafe repo names', async () => {
  await assert.rejects(
    runScript(tempWorkspaceRoot, ['--repo', '../escape']),
    /Repo names must not contain path separators/,
  )
})
