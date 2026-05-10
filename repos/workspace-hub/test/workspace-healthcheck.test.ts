import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'

import {
  workspaceHubIntentHeaderName,
  workspaceHubIntentHeaderValue,
} from '../src/lib/workspaceHubIntent.ts'

const repoRoot = path.resolve(import.meta.dirname, '..')
const tempRoots: string[] = []

async function createTempWorkspaceRoot(prefix: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix))
  tempRoots.push(root)
  return root
}

async function writeTextFile(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

async function waitForServer(url: string, timeoutMs = 10000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Retry until the timeout elapses.
    }

    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  throw new Error(`Timed out waiting for server: ${url}`)
}

after(async () => {
  for (const root of tempRoots) {
    await rm(root, { force: true, recursive: true })
  }
})

test('workspace healthcheck reports manifest validation warnings and observability', async () => {
  const workspaceRoot = await createTempWorkspaceRoot('codex-workspace-healthcheck-')

  for (const directory of ['cache', 'docs', 'repos', 'shared', 'tools/bin', 'tools/manifests', 'tools/mempalace']) {
    await mkdir(path.join(workspaceRoot, directory), { recursive: true })
  }

  await writeTextFile(path.join(workspaceRoot, 'repos', 'fixture-archive.zip'), 'archive fixture\n')

  await writeTextFile(
    path.join(workspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json'),
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            cacheRoot: 'cache/mempalace',
            category: 'memory',
            classification: 'core-service',
            description: 'Workspace memory fixture',
            docsPath: 'docs',
            id: 'mempalace',
            installCommand: ['tools/bin/workspace-memory', 'install'],
            installMethod: 'git',
            installTarget: 'tools/mempalace',
            name: 'MemPalace',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: 'shared/mempalace',
            sourceUrl: 'https://example.com/mempalace.git',
            syncCommand: ['tools/bin/mempalace-sync'],
            updateStrategy: 'git-sync-command',
          },
          {
            category: 'memory',
            classification: 'core-service',
            description: 'Broken test entry',
            id: 'broken-service',
            installCommand: ['tools/bin/workspace-memory', 'install'],
            installMethod: 'git',
            installTarget: 'tools/mempalace',
            name: 'Broken Service',
            runtimeCommand: ['tools/bin/mempalace-start'],
            sharedRoot: '../shared-outside',
            sourceUrl: 'https://example.com/broken-service.git',
            syncCommand: ['tools/bin/mempalace-sync'],
            updateStrategy: 'git-sync-command',
          },
        ],
      },
      null,
      2,
    ),
  )

  const port = 46000 + Math.floor(Math.random() * 1000)
  const baseUrl = `http://127.0.0.1:${port}`
  const child = spawn('pnpm', ['exec', 'tsx', 'server/index.ts'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      WORKSPACE_HUB_API_HOST: '127.0.0.1',
      WORKSPACE_HUB_API_PORT: String(port),
      WORKSPACE_HUB_WORKSPACE_ROOT: workspaceRoot,
    },
    stdio: 'pipe',
  })

  try {
    await waitForServer(`${baseUrl}/api/health`)

    const response = await fetch(`${baseUrl}/api/workspace/healthcheck`)
    assert.equal(response.status, 200)

    const payload = await response.json() as {
      checks: Array<{ message: string; name: string; ok: boolean }>
      observability: {
        capabilities?: object
        coreServices?: { rejectedEntries: number }
        search?: { indexRevision: number }
      }
      status: 'ok' | 'warn'
    }

    assert.equal(payload.status, 'warn')
    assert.ok(payload.checks.some((check) => check.name === 'coreServices' && check.ok === false))
    assert.ok(payload.checks.some((check) => check.name === 'capabilities' && check.ok === true))
    assert.ok(payload.checks.some((check) => check.name === 'searchObservability' && check.ok === true))
    assert.equal(payload.observability.coreServices?.rejectedEntries, 1)
    assert.equal(typeof payload.observability.search?.indexRevision, 'number')

    const defaultSummaryResponse = await fetch(`${baseUrl}/api/workspace/summary/base`)
    assert.equal(defaultSummaryResponse.status, 200)
    const defaultSummary = await defaultSummaryResponse.json() as {
      archives: unknown[]
      stats: { archiveFiles: number }
    }
    assert.deepEqual(defaultSummary.archives, [])
    assert.equal(defaultSummary.stats.archiveFiles, 0)

    const archiveSummaryResponse = await fetch(`${baseUrl}/api/workspace/summary/base?includeArchives=true`)
    assert.equal(archiveSummaryResponse.status, 200)
    const archiveSummary = await archiveSummaryResponse.json() as {
      archives: Array<{ relativePath: string }>
      stats: { archiveFiles: number }
    }
    assert.ok(
      archiveSummary.archives.some((archive) => archive.relativePath === 'repos/fixture-archive.zip'),
    )
    assert.ok(archiveSummary.stats.archiveFiles >= 1)

    const invalidJsonWithoutIntentResponse = await fetch(`${baseUrl}/api/runtime/stop-all`, {
      body: '{',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    assert.equal(invalidJsonWithoutIntentResponse.status, 403)

    const unguardedPostResponse = await fetch(`${baseUrl}/api/runtime/stop-all`, {
      method: 'POST',
    })
    assert.equal(unguardedPostResponse.status, 403)

    const foreignOriginPostResponse = await fetch(`${baseUrl}/api/runtime/stop-all`, {
      headers: {
        Origin: 'https://example.com',
        [workspaceHubIntentHeaderName]: workspaceHubIntentHeaderValue,
      },
      method: 'POST',
    })
    assert.equal(foreignOriginPostResponse.status, 403)

    const trustedLoopbackOriginPostResponse = await fetch(`${baseUrl}/api/runtime/stop-all`, {
      headers: {
        Origin: 'http://localhost:4100',
        [workspaceHubIntentHeaderName]: workspaceHubIntentHeaderValue,
      },
      method: 'POST',
    })
    assert.equal(trustedLoopbackOriginPostResponse.status, 200)

    const guardedPostResponse = await fetch(`${baseUrl}/api/runtime/stop-all`, {
      headers: {
        [workspaceHubIntentHeaderName]: workspaceHubIntentHeaderValue,
      },
      method: 'POST',
    })
    assert.equal(guardedPostResponse.status, 200)

    const serviceHeaders = {
      'Content-Type': 'application/json',
      [workspaceHubIntentHeaderName]: workspaceHubIntentHeaderValue,
    }
    const pausedMessage = 'Workspace memory is temporarily paused.'

    for (const [pathname, body] of [
      ['/api/services/install', { serviceId: 'mempalace' }],
      ['/api/services/runtime', { action: 'start', serviceId: 'mempalace' }],
      ['/api/services/sync', { serviceId: 'mempalace' }],
      ['/api/services/command', { commandId: 'search', searchQuery: 'workspace memory', serviceId: 'mempalace' }],
    ] as const) {
      const serviceResponse = await fetch(`${baseUrl}${pathname}`, {
        body: JSON.stringify(body),
        headers: serviceHeaders,
        method: 'POST',
      })
      assert.equal(serviceResponse.status, 400)
      assert.equal((await serviceResponse.json() as { message: string }).message, pausedMessage)
    }

    const contextResponse = await fetch(`${baseUrl}/api/services/context`, {
      body: JSON.stringify({ serviceId: 'mempalace', targetKind: 'workspace-docs' }),
      headers: serviceHeaders,
      method: 'POST',
    })
    assert.equal(contextResponse.status, 200)
    const contextPayload = await contextResponse.json() as {
      commands: Array<{ enabled: boolean; id: string; reasonDisabled: string | null }>
    }
    assert.ok(
      contextPayload.commands.every(
        (command) => command.enabled === false && command.reasonDisabled === pausedMessage,
      ),
    )
  } finally {
    child.kill('SIGTERM')
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve())
      setTimeout(() => resolve(), 3000)
    })
  }
})
