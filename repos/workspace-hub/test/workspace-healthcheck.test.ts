import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'

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

  for (const directory of ['cache', 'docs', 'repos', 'shared', 'tools/manifests']) {
    await mkdir(path.join(workspaceRoot, directory), { recursive: true })
  }

  await writeTextFile(
    path.join(workspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json'),
    JSON.stringify(
      {
        version: 1,
        capabilities: [
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
  } finally {
    child.kill('SIGTERM')
    await new Promise<void>((resolve) => {
      child.once('exit', () => resolve())
      setTimeout(() => resolve(), 3000)
    })
  }
})
