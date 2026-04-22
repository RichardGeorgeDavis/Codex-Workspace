import assert from 'node:assert/strict'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

type CoreServicesModule = typeof import('../server/core-services.ts')
type CoreServiceRuntimeModule = typeof import('../server/core-service-runtime.ts')
type MempalaceGraphModule = typeof import('../server/mempalace-graph.ts')

const execFileAsync = promisify(execFile)
const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const tempWorkspaceRoots: string[] = []

async function createTempWorkspaceRoot(prefix: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix))
  tempWorkspaceRoots.push(root)
  return root
}

async function writeTextFile(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

async function createCoreServiceWorkspaceFixture(root: string) {
  for (const directory of ['cache', 'docs', 'shared', 'tools/bin', 'tools/manifests']) {
    await mkdir(path.join(root, directory), { recursive: true })
  }

  await writeTextFile(
    path.join(root, 'docs', '11-core-memory-and-reference-promotion.md'),
    '# Memory docs\n',
  )

  await writeTextFile(
    path.join(root, 'tools', 'manifests', 'workspace-capabilities.json'),
    JSON.stringify(
      {
        capabilities: [
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            docsPath: 'docs/11-core-memory-and-reference-promotion.md',
            id: 'mempalace',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: 'tools/mempalace',
            name: 'MemPalace',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
        ],
      },
      null,
      2,
    ),
  )

  await writeTextFile(
    path.join(root, 'tools', 'bin', 'workspace-memory'),
    `#!/usr/bin/env sh
set -eu

workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
user=\${CODEX_WORKSPACE_USER:-default}
shared_root="$workspace_root/shared/mempalace/$user"
state_path="$shared_root/service-state.json"
mkdir -p "$shared_root"

command_name=\${1:-}
case "$command_name" in
  search)
    query=\${2:-}
    cat >"$state_path" <<EOF
{
  "serviceId": "mempalace",
  "lastCommandAt": "2026-04-10T10:30:00Z",
  "lastCommandKind": "search",
  "lastCommandTarget": "$query",
  "lastSearchAt": "2026-04-10T10:30:00Z",
  "lastSearchQuery": "$query",
  "updatedAt": "2026-04-10T10:30:00Z"
}
EOF
    printf 'searched: %s\\n' "$query"
    ;;
  *)
    printf 'ok\\n'
    ;;
esac
`,
  )
  await chmod(path.join(root, 'tools', 'bin', 'workspace-memory'), 0o755)
}

async function importCoreServiceModules(root: string) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  process.env.CODEX_WORKSPACE_USER = 'test-user'
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const [coreServices, coreServiceRuntime] = await Promise.all([
    import(new URL(`../server/core-services.ts?test=${cacheBuster}`, import.meta.url).href),
    import(new URL(`../server/core-service-runtime.ts?test=${cacheBuster}`, import.meta.url).href),
  ])

  return {
    coreServiceRuntime: coreServiceRuntime as CoreServiceRuntimeModule,
    coreServices: coreServices as CoreServicesModule,
  }
}

async function importMempalaceGraphModule(root: string) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  process.env.CODEX_WORKSPACE_USER = 'test-user'
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return (await import(
    new URL(`../server/mempalace-graph.ts?test=${cacheBuster}`, import.meta.url).href
  )) as MempalaceGraphModule
}

async function createGraphWorkspaceFixture(root: string) {
  for (const directory of ['cache', 'docs/.workspace/mempalace', 'shared', 'tools/bin', 'tools/scripts']) {
    await mkdir(path.join(root, directory), { recursive: true })
  }

  const wrapperSource = await readFile(path.join(workspaceRoot, 'tools', 'bin', 'workspace-memory'), 'utf8')
  const envSource = await readFile(path.join(workspaceRoot, 'tools', 'scripts', 'mempalace-env.sh'), 'utf8')
  const graphBuilderSource = await readFile(
    path.join(workspaceRoot, 'tools', 'scripts', 'build-mempalace-graph.mjs'),
    'utf8',
  )

  await writeTextFile(path.join(root, 'tools', 'bin', 'workspace-memory'), wrapperSource)
  await writeTextFile(path.join(root, 'tools', 'scripts', 'mempalace-env.sh'), envSource)
  await writeTextFile(path.join(root, 'tools', 'scripts', 'build-mempalace-graph.mjs'), graphBuilderSource)
  await chmod(path.join(root, 'tools', 'bin', 'workspace-memory'), 0o755)

  await writeTextFile(
    path.join(root, 'docs', '.workspace', 'mempalace', 'mempalace.yaml'),
    `wing: docs
rooms:
- name: documentation
  description: Files from docs/
  keywords:
  - documentation
  - docs
- name: planning
  description: Planning notes
  keywords:
  - handover
  - roadmap
`,
  )
  await writeTextFile(
    path.join(root, 'docs', '.workspace', 'mempalace', 'entities.json'),
    JSON.stringify(
      {
        people: ['Richard'],
        projects: ['Workspace Hub', 'MemPalace'],
      },
      null,
      2,
    ),
  )
  await writeTextFile(
    path.join(root, 'docs', 'README.md'),
    '# Workspace Hub\n\nMemPalace documentation and handover notes live here.\n',
  )
  await writeTextFile(
    path.join(root, 'docs', 'HANDOVER.md'),
    '# Handover\n\nWorkspace Hub roadmap and documentation planning notes.\n',
  )
}

after(async () => {
  delete process.env.CODEX_WORKSPACE_USER
  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT

  for (const root of tempWorkspaceRoots) {
    await rm(root, { force: true, recursive: true })
  }
})

test('core service search command updates persisted MemPalace service state', async () => {
  const root = await createTempWorkspaceRoot('codex-workspace-mempalace-search-')
  await createCoreServiceWorkspaceFixture(root)

  const { coreServices, coreServiceRuntime } = await importCoreServiceModules(root)
  const service = await coreServices.findCoreService('mempalace', new Map(), new Map())

  assert.ok(service)

  const result = await coreServiceRuntime.runCoreServiceCommand(service, 'search', {
    searchQuery: 'graph memory status',
  })

  assert.equal(result.command, "tools/bin/workspace-memory search 'graph memory status'")
  assert.match(result.output, /searched: graph memory status/)

  const refreshedService = await coreServices.findCoreService('mempalace', new Map(), new Map())
  assert.ok(refreshedService)
  assert.equal(refreshedService.lastSearchQuery, 'graph memory status')
  assert.equal(refreshedService.lastSearchAt, '2026-04-10T10:30:00Z')
  assert.equal(refreshedService.lastCommandKind, 'search')
})

test('core service reader skips services whose paths escape the workspace root', async () => {
  const root = await createTempWorkspaceRoot('codex-workspace-mempalace-invalid-path-')
  await createCoreServiceWorkspaceFixture(root)

  await writeTextFile(
    path.join(root, 'tools', 'manifests', 'workspace-capabilities.json'),
    JSON.stringify(
      {
        capabilities: [
          {
            cacheRoot: '../cache-outside',
            category: 'memory',
            classification: 'core-service',
            docsPath: 'docs/11-core-memory-and-reference-promotion.md',
            id: 'mempalace',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: '../tools/mempalace',
            name: 'MemPalace',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
        ],
      },
      null,
      2,
    ),
  )

  const { coreServices } = await importCoreServiceModules(root)
  const service = await coreServices.findCoreService('mempalace', new Map(), new Map())
  const observability = coreServices.getWorkspaceCoreServicesObservability()

  assert.equal(service, null)
  assert.equal(observability.rejectedEntries, 1)
  assert.match(
    Object.keys(observability.manifestIssueReasons)[0] ?? '',
    /outside the workspace root/i,
  )
})

test('core service reader records validation issues for invalid manifest fields', async () => {
  const root = await createTempWorkspaceRoot('codex-workspace-mempalace-manifest-issues-')
  await createCoreServiceWorkspaceFixture(root)

  await writeTextFile(
    path.join(root, 'tools', 'manifests', 'workspace-capabilities.json'),
    JSON.stringify(
      {
        capabilities: [
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            docsPath: '../outside-docs.md',
            id: 'bad-docs',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: 'tools/mempalace',
            name: 'Bad Docs',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            id: 'missing-name',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: 'tools/mempalace',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            id: 'bad-shared-root',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: 'tools/mempalace',
            name: 'Bad Shared Root',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: '../shared-outside',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
          {
            cacheRoot: '../cache-outside',
            category: 'memory',
            classification: 'core-service',
            id: 'bad-cache-root',
            installCommand: ['tools/bin/workspace-memory'],
            installTarget: 'tools/mempalace',
            name: 'Bad Cache Root',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            id: 'bad-command',
            installCommand: 'tools/bin/workspace-memory',
            installTarget: 'tools/mempalace',
            name: 'Bad Command',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            syncCommand: ['tools/bin/mempalace-sync'],
          },
        ],
      },
      null,
      2,
    ),
  )

  const { coreServices } = await importCoreServiceModules(root)
  const result = await coreServices.readCoreServices(new Map(), new Map())

  assert.equal(result.services.length, 0)
  assert.equal(result.manifestIssues.length, 5)
  assert.ok(result.manifestIssues.some((issue) => /docs path resolves outside/i.test(issue.reason)))
  assert.ok(result.manifestIssues.some((issue) => /missing required service name/i.test(issue.reason)))
  assert.ok(result.manifestIssues.some((issue) => /shared root resolves outside/i.test(issue.reason)))
  assert.ok(result.manifestIssues.some((issue) => /cache root resolves outside/i.test(issue.reason)))
  assert.ok(result.manifestIssues.some((issue) => /install command must be a non-empty workspace-local argv array/i.test(issue.reason)))
})

test('workspace-memory build-graph emits target-scoped graph artifacts', async () => {
  const root = await createTempWorkspaceRoot('codex-workspace-mempalace-graph-')
  await createGraphWorkspaceFixture(root)

  await execFileAsync(path.join(root, 'tools', 'bin', 'workspace-memory'), ['build-graph', 'workspace-docs'], {
    cwd: root,
    env: {
      ...process.env,
      CODEX_WORKSPACE_USER: 'test-user',
      HOME: path.join(root, 'home'),
      USER: 'test-user',
    },
  })

  const outputDir = path.join(root, 'cache', 'mempalace', 'test-user', 'graphs', 'workspace-docs')
  const graphJsonPath = path.join(outputDir, 'graph.json')
  const graphHtmlPath = path.join(outputDir, 'graph.html')
  const graphReportPath = path.join(outputDir, 'graph-report.md')
  const graph = JSON.parse(await readFile(graphJsonPath, 'utf8')) as {
    edges: Array<{ type: string }>
    summary: { edgeCount: number; nodeCount: number; roomCount: number }
    target: { kind: string; label: string }
  }

  assert.equal(graph.target.kind, 'workspace-docs')
  assert.equal(graph.target.label, 'Workspace docs')
  assert.ok(graph.summary.nodeCount >= 4)
  assert.ok(graph.summary.edgeCount >= 3)
  assert.ok(graph.summary.roomCount >= 2)
  assert.ok(graph.edges.some((edge) => edge.type === 'contains'))
  assert.match(await readFile(graphHtmlPath, 'utf8'), /MemPalace Graph/)
  assert.match(await readFile(graphReportPath, 'utf8'), /MemPalace Graph Report/)

  const mempalaceGraph = await importMempalaceGraphModule(root)
  const snapshot = await mempalaceGraph.readMempalaceGraphSnapshot({
    cacheRoot: path.join(root, 'cache', 'mempalace', 'test-user'),
  } as Parameters<typeof mempalaceGraph.readMempalaceGraphSnapshot>[0], {
    available: true,
  })

  assert.ok(snapshot.nodeTypeCounts.room)
  assert.ok(snapshot.derivedEdgeCount !== null)
  assert.ok(snapshot.reportExcerpt.length > 0)
})
