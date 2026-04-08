import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { promisify } from 'node:util'

type WorkspaceModule = typeof import('../server/workspace.ts')
type WorkspaceSearchModule = typeof import('../server/workspace-search.ts')

let tempWorkspaceRoot = ''
const execFileAsync = promisify(execFile)

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

async function initGitRepo(root: string, relativePath: string) {
  const repoPath = path.join(root, 'repos', relativePath)
  await execFileAsync('git', ['init'], { cwd: repoPath })
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
    await new Promise((resolve) => {
      setTimeout(resolve, 120)
    })
    await rm(tempWorkspaceRoot, { force: true, recursive: true })
  }
})

test('workspace summary refreshes discovered repo set when repo tree changes', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-a')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')

  const firstSummary = await workspaceModule.buildWorkspaceSummary(4101, new Map(), new Map())
  assert.equal(firstSummary.repos.length, 1)

  await createNodeRepo(tempWorkspaceRoot, 'repo-b')

  const cachedSummary = await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
  )
  assert.equal(
    cachedSummary.repos.length,
    2,
    'Expected summary to refresh when repo tree signature changes.',
  )
})

test('workspace summary cache invalidation can force a refresh', async () => {
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  const refreshedSummary = await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
  )
  assert.ok(refreshedSummary.repos.length >= 2)
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

test('indexed search can surface installable workspace capabilities', async () => {
  const docsPath = path.join(tempWorkspaceRoot, 'docs', 'ability-note.md')
  const capabilityToken = 'capability-search-token-456'
  await writeTextFile(docsPath, `${capabilityToken}\n`)

  const searchModule = await importWorkspaceSearchModule(tempWorkspaceRoot, 'false')
  const result = await searchModule.searchWorkspace(
    capabilityToken,
    [],
    [],
    [
      {
        category: 'workspace',
        classification: 'ability',
        description: 'Searchable optional ability',
        docsPath,
        enabled: true,
        enabledByDefault: false,
        exposeInHub: true,
        id: 'searchable-ability',
        installMethod: 'git',
        installPath: path.join(tempWorkspaceRoot, 'repos', 'abilities', 'searchable-ability'),
        installTarget: 'repos/abilities/searchable-ability',
        installed: false,
        name: 'Searchable Ability',
        notes: '',
        readmePath: null,
        repoUsageNotes: 'Use this ability when reviewing external catalog content.',
        sourceUrl: 'https://example.com/searchable-ability.git',
        uninstallPolicy: '',
        updateStrategy: 'git-fast-forward',
      },
    ],
  )

  assert.ok(result.results.some((entry) => entry.category === 'capability'))
  const capabilityResult = result.results.find((entry) => entry.category === 'capability')
  assert.equal(capabilityResult?.capabilityId, 'searchable-ability')
})

test('base summary mode skips heavy diagnostics while preserving repo discovery', async () => {
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  const baseSummary = await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false, repoProjection: 'list' },
  )

  assert.ok(baseSummary.repos.length >= 1)

  const repo = baseSummary.repos[0]
  assert.equal(repo.detailLevel, 'list')
  assert.equal(repo.health.state, 'unknown')
  assert.equal(repo.git.state, 'unavailable')
  assert.equal(repo.dependencies.state, 'unknown')
  assert.match(repo.git.summary, /skipped for base summary/i)
  assert.match(repo.dependencies.reason, /skipped for base summary/i)
  assert.equal(repo.diagnosticsFreshness, 'skipped')
  assert.deepEqual(repo.install.logTail, [])
  assert.deepEqual(repo.runtime.logTail, [])
  assert.equal(repo.savedMetadata, null)
})

test('repo details can eagerly hydrate diagnostics without rebuilding full workspace summary', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-detail-hydration')
  await initGitRepo(tempWorkspaceRoot, 'repo-detail-hydration')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  const baseSummary = await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )
  const baseRepo = baseSummary.repos.find((entry) =>
    entry.relativePath.endsWith('repo-detail-hydration'),
  )
  assert.ok(baseRepo)
  assert.equal(baseRepo.diagnosticsFreshness, 'skipped')

  const detailedRepo = await workspaceModule.buildWorkspaceRepoDetails(
    baseRepo.relativePath,
    new Map(),
    new Map(),
  )
  assert.ok(detailedRepo)
  assert.equal(detailedRepo.detailLevel, 'detail')
  assert.equal(detailedRepo.diagnosticsFreshness, 'fresh')
  assert.equal(detailedRepo.git.hasGit, true)

  const observability = workspaceModule.getWorkspaceHubObservability()
  assert.equal(observability.observabilityVersion, 2)
  assert.equal(observability.repoDetails.requests >= 1, true)
  assert.equal(typeof observability.repoDetails.lastDurationMs, 'number')
})

test('diagnostics mode warms git diagnostics asynchronously via worker', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-git-worker')
  await initGitRepo(tempWorkspaceRoot, 'repo-git-worker')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  const firstSummary = await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: true },
  )
  const firstRepo = firstSummary.repos.find((entry) => entry.relativePath.endsWith('repo-git-worker'))
  assert.ok(firstRepo)
  assert.equal(firstRepo.git.hasGit, false)
  assert.equal(firstRepo.diagnosticsFreshness, 'warming')

  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    const refreshedSummary = await workspaceModule.buildWorkspaceSummary(
      4101,
      new Map(),
      new Map(),
      { includeDiagnostics: true },
    )
    const refreshedRepo = refreshedSummary.repos.find((entry) =>
      entry.relativePath.endsWith('repo-git-worker'),
    )
    assert.ok(refreshedRepo)

    if (refreshedRepo.git.hasGit) {
      assert.equal(refreshedRepo.diagnosticsFreshness, 'fresh')
      assert.match(refreshedRepo.git.summary, /Git status available|No commits yet on/i)
      return
    }
  }

  assert.fail('Expected background diagnostics worker to warm git diagnostics.')
})

test('discovery cache can be reused for base summary after diagnostics worker updates', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-base-cache')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )
  const before = workspaceModule.getWorkspaceHubObservability()

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: true },
  )

  await new Promise((resolve) => {
    setTimeout(resolve, 120)
  })

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )
  const after = workspaceModule.getWorkspaceHubObservability()

  assert.ok(
    after.discoveryCacheHits > before.discoveryCacheHits,
    'Expected base summary cache hits to increase even after diagnostics worker updates.',
  )
})

test('workspace observability reports discovery and diagnostics cache counters', async () => {
  await createNodeRepo(tempWorkspaceRoot, 'repo-observability-counters')
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )
  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: true },
  )
  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: true },
  )

  const observability = workspaceModule.getWorkspaceHubObservability()
  assert.equal(observability.observabilityVersion, 2)
  assert.ok(observability.discovery)
  assert.ok(observability.diagnostics)
  assert.ok(observability.repoDetails)
  assert.ok(observability.summary)
  assert.equal(typeof observability.discovery.hits, 'number')
  assert.equal(typeof observability.diagnostics.misses, 'number')
  assert.equal(typeof observability.repoDetails.requests, 'number')
  assert.equal(typeof observability.summary.requestsFull, 'number')
  assert.ok(observability.discoveryCacheMisses >= 1)
  assert.ok(observability.discoveryCacheHits >= 1)
  assert.ok(observability.diagnosticsCacheMisses >= 1)
  assert.ok(observability.discoveryCacheMaxEntries >= 1)
})

test('discovery cache enforces a bounded max entries policy', async () => {
  const workspaceModule = await importWorkspaceModule(tempWorkspaceRoot, '60000')
  workspaceModule.invalidateWorkspaceSummaryCache()

  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map(),
    new Map(),
    { includeDiagnostics: false },
  )
  await workspaceModule.buildWorkspaceSummary(
    4101,
    new Map([
      [
        path.join(tempWorkspaceRoot, 'repos', 'repo-cache-a'),
        {
          command: null,
          finishedAt: null,
          lastExitCode: null,
          lastSignal: null,
          logTail: [],
          message: null,
          startedAt: null,
          status: 'idle',
          updatedAt: new Date().toISOString(),
        },
      ],
    ]),
    new Map(),
    { includeDiagnostics: false },
  )

  const observability = workspaceModule.getWorkspaceHubObservability()
  assert.ok(observability.discoveryCacheEntries <= observability.discoveryCacheMaxEntries)
})
