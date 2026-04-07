import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'

type WorkspaceModule = typeof import('../server/workspace.ts')
type WorkspaceSearchModule = typeof import('../server/workspace-search.ts')

let tempWorkspaceRoot = ''

async function writeTextFile(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

async function setupWorkspaceFixture(root: string) {
  for (const directory of ['cache', 'docs', 'repos', 'shared']) {
    await mkdir(path.join(root, directory), { recursive: true })
  }
}

async function createNodeRepo(root: string, relativePath: string) {
  await writeTextFile(
    path.join(root, 'repos', relativePath, 'package.json'),
    '{\n  "name": "fixture"\n}\n',
  )
}

async function importWorkspaceModule(root: string, cacheTtlMs: string) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  process.env.WORKSPACE_HUB_DISCOVERY_CACHE_TTL_MS = cacheTtlMs
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return (await import(
    new URL(`../server/workspace.ts?test=${cacheBuster}`, import.meta.url).href
  )) as WorkspaceModule
}

async function importWorkspaceSearchModule(
  root: string,
  includeArtifacts: 'false' | 'true',
) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  process.env.WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS = includeArtifacts
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return (await import(
    new URL(`../server/workspace-search.ts?test=${cacheBuster}`, import.meta.url).href
  )) as WorkspaceSearchModule
}

before(async () => {
  tempWorkspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codex-workspace-hub-cache-search-'))
  await setupWorkspaceFixture(tempWorkspaceRoot)
})

after(async () => {
  delete process.env.WORKSPACE_HUB_DISCOVERY_CACHE_TTL_MS
  delete process.env.WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS
  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT

  if (tempWorkspaceRoot) {
    await rm(tempWorkspaceRoot, { force: true, recursive: true })
  }
})

test('workspace summary cache invalidation refreshes discovered repo set', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-a')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')

  const firstSummary = await workspaceModule.buildWorkspaceSummary(4101, new Map(), new Map())
  assert.equal(firstSummary.repos.length, 1)

  await createNodeRepo(tempWorkspaceRoot, 'repo-b')

  const cachedSummary = await workspaceModule.buildWorkspaceSummary(4101, new Map(), new Map())
  assert.equal(
    cachedSummary.repos.length,
    1,
    'Expected cached summary to remain stable before explicit invalidation.',
  )

  workspaceModule.invalidateWorkspaceSummaryCache()
  const refreshedSummary = await workspaceModule.buildWorkspaceSummary(4101, new Map(), new Map())
  assert.equal(refreshedSummary.repos.length, 2)
})

test('artifact search indexing is opt-in via env gate', async () => {
  const artifactPath = path.join(
    tempWorkspaceRoot,
    'cache',
    'context',
    'agents',
    'jobs',
    'job-alpha',
    'artifact.jsonl',
  )
  const token = 'artifact-gate-token-123'
  await writeTextFile(artifactPath, `${token}\n`)

  const searchDefault = await importWorkspaceSearchModule(tempWorkspaceRoot, 'false')
  const defaultResult = await searchDefault.searchWorkspace(token, [])
  assert.equal(defaultResult.results.length, 0)

  const searchEnabled = await importWorkspaceSearchModule(tempWorkspaceRoot, 'true')
  const enabledResult = await searchEnabled.searchWorkspace(token, [])
  assert.ok(enabledResult.results.some((entry) => entry.category === 'artifact'))
})
