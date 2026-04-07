import express, { type NextFunction, type Request, type Response } from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { applyRepoAgentPreset, isRepoAgentPresetId } from './agent-tooling.ts'
import { handleWorkspaceEvents, publishWorkspaceEvent } from './live-events.ts'
import { waitForReachablePreview } from './preview-readiness.ts'
import { generateRepoCover } from './repo-cover.ts'
import { runRepoIntake } from './repo-intake.ts'
import { writeRepoManifest } from './repo-manifest.ts'
import {
  canInstallRepo,
  getInstallSnapshots,
  canRunRepo,
  getRuntimeSnapshots,
  openInTerminal,
  openTarget,
  runRepoInstall,
  restartRepoRuntime,
  shutdownManagedRuntimes,
  startRepoRuntime,
  stopRepoRuntime,
} from './runtime-manager.ts'
import { applyWorkspaceProcessEnv } from './workspace-env.ts'
import {
  resetRepoMetadata,
  saveRepoActivity,
  saveRepoMetadata,
} from './workspace-metadata.ts'
import {
  buildWorkspaceSummary,
  findWorkspaceRepo,
  invalidateWorkspaceSummaryCache,
} from './workspace.ts'
import { searchWorkspace } from './workspace-search.ts'

const apiHost = process.env.WORKSPACE_HUB_API_HOST ?? '127.0.0.1'
const apiPort = Number.parseInt(process.env.WORKSPACE_HUB_API_PORT ?? '4101', 10)
const serverDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
applyWorkspaceProcessEnv(workspaceRoot)
const runtimeTroubleshootingPath = fileURLToPath(
  new URL('../docs/runtime-troubleshooting.md', import.meta.url),
)

const app = express()

app.use(express.json())

function isLocalPreviewTarget(target: string | null) {
  if (!target) {
    return false
  }

  try {
    const url = new URL(target)
    const hostname = url.hostname.toLowerCase()

    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname.endsWith('.demo') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test')
    )
  } catch {
    return false
  }
}

function requireRelativePath(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    throw new Error('A repo relativePath is required.')
  }

  const candidate = (body as Record<string, unknown>).relativePath

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    throw new Error('A repo relativePath is required.')
  }

  return candidate.trim()
}

function requireObjectPayload(body: unknown, fieldName: string, message: string) {
  if (typeof body !== 'object' || body === null) {
    throw new Error(message)
  }

  const payload = (body as Record<string, unknown>)[fieldName]

  if (typeof payload !== 'object' || payload === null) {
    throw new Error(message)
  }

  return payload as Record<string, unknown>
}

function isPathInsideRoot(rootPath: string, candidatePath: string) {
  const relativePath = path.relative(rootPath, candidatePath)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  )
}

function requireTargetPath(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    throw new Error('A workspace target path is required.')
  }

  const candidate = (body as Record<string, unknown>).path

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    throw new Error('A workspace target path is required.')
  }

  const targetPath = path.resolve(candidate.trim())

  if (!isPathInsideRoot(workspaceRoot, targetPath)) {
    throw new Error('The requested path must stay inside the workspace root.')
  }

  return targetPath
}

function invalidateWorkspaceCaches() {
  invalidateWorkspaceSummaryCache()
}

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    generatedAt: new Date().toISOString(),
    port: apiPort,
    service: 'workspace-hub-api',
    status: 'ok',
  })
})

app.get('/api/events', (request: Request, response: Response) => {
  handleWorkspaceEvents(request, response)
})

app.get(
  '/api/workspace/summary',
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      response.json(
        await buildWorkspaceSummary(
          apiPort,
          getInstallSnapshots(),
          getRuntimeSnapshots(),
        ),
      )
    } catch (error) {
      next(error)
    }
  },
)

app.get(
  '/api/workspace/summary/base',
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      response.json(
        await buildWorkspaceSummary(
          apiPort,
          getInstallSnapshots(),
          getRuntimeSnapshots(),
          { includeDiagnostics: false },
        ),
      )
    } catch (error) {
      next(error)
    }
  },
)

app.get(
  '/api/search',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query =
        typeof request.query.q === 'string' ? request.query.q.trim() : ''

      if (!query) {
        response.status(400).json({ message: 'A search query is required.' })
        return
      }

      const summary = await buildWorkspaceSummary(
        apiPort,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      response.json(await searchWorkspace(query, summary.repos))
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/open',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const target =
        typeof request.body?.target === 'string' ? request.body.target : ''
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      if (target === 'repo') {
        openTarget(repo.path)
      } else if (target === 'terminal') {
        openInTerminal(repo.path)
      } else if (target === 'manifest') {
        if (!repo.manifestPath) {
          response.status(400).json({ message: 'This repo does not have a manifest yet.' })
          return
        }

        openTarget(repo.manifestPath)
      } else if (target === 'readme') {
        if (!repo.readmePath) {
          response.status(400).json({ message: 'This repo does not have a README.' })
          return
        }

        openTarget(repo.readmePath)
      } else if (target === 'failure-report') {
        if (!repo.failureReport?.filePath) {
          response.status(400).json({ message: 'This repo does not have a failure report yet.' })
          return
        }

        openTarget(repo.failureReport.filePath)
      } else if (target === 'preview') {
        const url = repo.previewUrl
        if (!url) {
          response
            .status(400)
            .json({ message: 'This repo does not have a preview URL yet.' })
          return
        }

        const previewProbeTarget = repo.healthcheckUrl ?? url
        const shouldAutoStartPreview =
          repo.preferredMode === 'direct' &&
          repo.runtime.status !== 'running' &&
          canRunRepo(repo) &&
          isLocalPreviewTarget(previewProbeTarget)

        let previewReachable = true

        if (isLocalPreviewTarget(previewProbeTarget)) {
          previewReachable = await waitForReachablePreview(
            previewProbeTarget,
            repo.health.state === 'healthy' ? 1500 : 3500,
          )
        }

        if (!previewReachable && shouldAutoStartPreview) {
          await startRepoRuntime(repo)
          previewReachable = await waitForReachablePreview(previewProbeTarget, 12000)

          if (!previewReachable) {
            response.status(502).json({
              message:
                'The repo was started, but its preview did not become reachable. Check the runtime log, preview URL, and startup port.',
            })
            return
          }
        }

        openTarget(url)
      } else if (target === 'troubleshooting') {
        openTarget(runtimeTroubleshootingPath)
      } else {
        response.status(400).json({ message: 'Unknown open target.' })
        return
      }

      await saveRepoActivity(relativePath, 'open')
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: target,
        relativePath,
        status: 'open',
        type: 'activity',
      })
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/runtime',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const action =
        typeof request.body?.action === 'string' ? request.body.action : ''
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      if (action === 'start') {
        if (!canRunRepo(repo)) {
          response
            .status(400)
            .json({ message: 'This repo does not have an inferred dev command.' })
          return
        }

        const runtime = await startRepoRuntime(repo)
        await saveRepoActivity(relativePath, 'runtime')
        invalidateWorkspaceCaches()
        publishWorkspaceEvent({
          message: action,
          relativePath,
          status: runtime.status,
          type: 'activity',
        })
        response.json({ runtime })
        return
      }

      if (action === 'stop') {
        const runtime = await stopRepoRuntime(repo.path)
        await saveRepoActivity(relativePath, 'runtime')
        invalidateWorkspaceCaches()
        publishWorkspaceEvent({
          message: action,
          relativePath,
          status: runtime?.status ?? 'stopped',
          type: 'activity',
        })
        response.json({ runtime })
        return
      }

      if (action === 'restart') {
        if (!canRunRepo(repo)) {
          response
            .status(400)
            .json({ message: 'This repo does not have an inferred dev command.' })
          return
        }

        const runtime = await restartRepoRuntime(repo)
        await saveRepoActivity(relativePath, 'runtime')
        invalidateWorkspaceCaches()
        publishWorkspaceEvent({
          message: action,
          relativePath,
          status: runtime.status,
          type: 'activity',
        })
        response.json({ runtime })
        return
      }

      response.status(400).json({ message: 'Unknown runtime action.' })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/runtime/stop-all',
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      await shutdownManagedRuntimes()
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: 'stop-all',
        relativePath: null,
        status: 'runtime',
        type: 'activity',
      })
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/install',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      if (!canInstallRepo(repo)) {
        response
          .status(400)
          .json({ message: 'This repo does not have an inferred install command.' })
        return
      }

      const install = await runRepoInstall(repo)
      await saveRepoActivity(relativePath, 'install')
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: 'install',
        relativePath,
        status: install.status,
        type: 'activity',
      })
      response.json({ install })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/cover',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      const cover = await generateRepoCover(repo)
      await saveRepoActivity(relativePath, 'open')
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: cover.coverImagePath,
        relativePath,
        status: 'cover',
        type: 'cover',
      })
      response.json({ cover })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/intake',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      const result = await runRepoIntake(repo, workspaceRoot)
      await saveRepoActivity(relativePath, 'open')
      invalidateWorkspaceCaches()

      publishWorkspaceEvent({
        message: result.manifestCreated ? 'intake + manifest' : 'intake',
        relativePath,
        status: 'intake',
        type: 'activity',
      })
      response.json({ ok: true, result })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/activity',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const kind = typeof request.body?.kind === 'string' ? request.body.kind : ''

      if (kind !== 'select') {
        response.status(400).json({ message: 'Unknown activity kind.' })
        return
      }

      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      response.json({ activity: await saveRepoActivity(relativePath, 'select'), ok: true })
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: 'select',
        relativePath,
        status: 'select',
        type: 'activity',
      })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/agent-preset',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const preset = request.body?.preset

      if (!isRepoAgentPresetId(preset)) {
        response.status(400).json({ message: 'A valid repo agent preset is required.' })
        return
      }

      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      const result = await applyRepoAgentPreset(
        repo.path,
        repo.relativePath,
        repo.name,
        preset,
      )

      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: preset,
        relativePath,
        status: result.appliedFiles.length ? 'applied' : 'unchanged',
        type: 'agent',
      })
      response.json({ ok: true, result })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/manifest',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      const result = await writeRepoManifest(
        repo.path,
        requireObjectPayload(
          request.body,
          'manifest',
          'Repo manifest payload is required.',
        ),
      )

      response.json({
        manifest: result.manifest,
        manifestPath: result.manifestPath,
        ok: true,
      })
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: result.manifestPath,
        relativePath,
        status: 'manifest',
        type: 'manifest',
      })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/metadata',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      const savedMetadata = await saveRepoMetadata(
        relativePath,
        requireObjectPayload(
          request.body,
          'metadata',
          'Repo metadata payload is required.',
        ),
      )

      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: 'saved',
        relativePath,
        status: 'metadata',
        type: 'metadata',
      })
      response.json({ metadata: savedMetadata, ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/repos/metadata/reset',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath = requireRelativePath(request.body)
      const repo = await findWorkspaceRepo(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      await resetRepoMetadata(relativePath)
      invalidateWorkspaceCaches()
      publishWorkspaceEvent({
        message: 'reset',
        relativePath,
        status: 'metadata',
        type: 'metadata',
      })
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/open/path',
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const targetPath = requireTargetPath(request.body)
      openTarget(targetPath)
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    void _next

    const message = error instanceof Error ? error.message : 'Unknown Workspace Hub error'
    console.error(`[workspace-hub-api] ${message}`)
    response.status(500).json({
      message: 'Workspace Hub could not complete this request. Check server logs for details.',
    })
  },
)

const server = app.listen(apiPort, apiHost, () => {
  console.info(
    `Workspace Hub API listening on http://${apiHost}:${apiPort}/api/health`,
  )
})

const shutdown = async () => {
  await shutdownManagedRuntimes()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
