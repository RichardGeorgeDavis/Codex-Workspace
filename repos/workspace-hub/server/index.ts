import express, { type NextFunction, type Request, type Response } from 'express'
import { fileURLToPath } from 'node:url'

import { generateRepoCover } from './repo-cover.ts'
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
import {
  resetRepoMetadata,
  saveRepoActivity,
  saveRepoMetadata,
} from './workspace-metadata.ts'
import { buildWorkspaceSummary, findWorkspaceRepo } from './workspace.ts'

const apiHost = process.env.WORKSPACE_HUB_API_HOST ?? '127.0.0.1'
const apiPort = Number.parseInt(process.env.WORKSPACE_HUB_API_PORT ?? '4101', 10)
const runtimeTroubleshootingPath = fileURLToPath(
  new URL('../docs/runtime-troubleshooting.md', import.meta.url),
)

const app = express()

app.use(express.json())

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

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    generatedAt: new Date().toISOString(),
    port: apiPort,
    service: 'workspace-hub-api',
    status: 'ok',
  })
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
      } else if (target === 'preview') {
        const url = repo.previewUrl
        if (!url) {
          response
            .status(400)
            .json({ message: 'This repo does not have a preview URL yet.' })
          return
        }

        openTarget(url)
      } else if (target === 'troubleshooting') {
        openTarget(runtimeTroubleshootingPath)
      } else {
        response.status(400).json({ message: 'Unknown open target.' })
        return
      }

      await saveRepoActivity(relativePath, 'open')
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
        response.json({ runtime })
        return
      }

      if (action === 'stop') {
        const runtime = await stopRepoRuntime(repo.path)
        await saveRepoActivity(relativePath, 'runtime')
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
      response.json({ cover })
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

    const message =
      error instanceof Error ? error.message : 'Unknown Workspace Hub error'

    response.status(500).json({ message })
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
