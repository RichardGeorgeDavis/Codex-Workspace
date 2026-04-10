import express, { type NextFunction, type Request, type Response } from 'express'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WorkspaceCoreServiceCommandId } from '../src/types/workspace.ts'

import { applyRepoAgentPreset, isRepoAgentPresetId } from './agent-tooling.ts'
import { handleWorkspaceEvents, publishWorkspaceEvent } from './live-events.ts'
import { waitForReachablePreview } from './preview-readiness.ts'
import { generateRepoCover } from './repo-cover.ts'
import { runRepoIntake } from './repo-intake.ts'
import { writeRepoManifest } from './repo-manifest.ts'
import { findCoreService } from './core-services.ts'
import { readMempalaceGraphSnapshot } from './mempalace-graph.ts'
import {
  buildWorkspaceCapabilitiesSnapshot,
  findWorkspaceCapability,
  runWorkspaceCapabilityAction,
} from './workspace-capabilities.ts'
import {
  canInstallCoreService,
  canRunCoreService,
  getCoreServiceInstallSnapshots,
  getCoreServiceRuntimeSnapshots,
  restartCoreService,
  runCoreServiceCommand,
  runCoreServiceInstall,
  runCoreServiceSync,
  startCoreService,
  stopCoreService,
} from './core-service-runtime.ts'
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
  buildWorkspaceRepoDetails,
  buildWorkspaceSummary,
  findWorkspaceRepo,
  getWorkspaceHubObservability,
  invalidateWorkspaceSummaryCache,
  recordSummaryRequest,
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

function parseSummaryReason(
  value: unknown,
): 'action' | 'event' | 'hydration' | 'initial' | 'manual-refresh' | 'search' {
  if (
    value === 'action' ||
    value === 'event' ||
    value === 'hydration' ||
    value === 'initial' ||
    value === 'manual-refresh' ||
    value === 'search'
  ) {
    return value
  }

  return 'manual-refresh'
}

function invalidateWorkspaceCaches() {
  invalidateWorkspaceSummaryCache()
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function parseServiceTargetKind(value: unknown): 'current-repo' | 'repo' | 'workspace-docs' {
  if (value === 'current-repo' || value === 'repo' || value === 'workspace-docs') {
    return value
  }

  return 'workspace-docs'
}

function readOptionalRelativePath(body: unknown, fieldName: string) {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const value = (body as Record<string, unknown>)[fieldName]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readOptionalString(body: unknown, fieldName: string) {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const value = (body as Record<string, unknown>)[fieldName]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isPathWithinRoot(rootPath: string, candidatePath: string) {
  const normalizedRootPath = path.resolve(rootPath)
  const normalizedCandidatePath = path.resolve(candidatePath)

  return (
    normalizedCandidatePath === normalizedRootPath ||
    normalizedCandidatePath.startsWith(`${normalizedRootPath}${path.sep}`)
  )
}

function targetMatchesPath(servicePath: string | null, targetPath: string | null) {
  if (!servicePath || !targetPath) {
    return false
  }

  const normalizedServicePath = path.resolve(servicePath)
  const normalizedTargetPath = path.resolve(targetPath)

  return (
    normalizedServicePath === normalizedTargetPath ||
    normalizedServicePath.startsWith(`${normalizedTargetPath}${path.sep}`)
  )
}

function buildMempalaceContextCommands(
  serviceId: string,
  targetKind: 'current-repo' | 'repo' | 'workspace-docs',
  repoRelativePath: string | null,
  targetAvailable: boolean,
) {
  const saveRepoEnabled = targetAvailable && (targetKind === 'current-repo' || targetKind === 'repo')
  const buildGraphCommand =
    targetAvailable && repoRelativePath
      ? `tools/bin/workspace-memory build-graph repo ${repoRelativePath}`
      : targetKind === 'workspace-docs'
        ? 'tools/bin/workspace-memory build-graph workspace-docs'
        : 'tools/bin/workspace-memory build-graph repo <relative-path>'
  const saveRepoCommand = repoRelativePath
    ? `tools/bin/workspace-memory save-repo ${repoRelativePath}`
    : 'tools/bin/workspace-memory save-repo <repo-name>'

  return [
    {
      description: 'Build a target-scoped graph export from MemPalace sidecars and nearby docs.',
      enabled: targetAvailable,
      id: 'build-graph',
      label: 'Build graph',
      reasonDisabled: targetAvailable ? null : 'Choose an available target before building a graph.',
      shellCommand: buildGraphCommand,
    },
    {
      description: 'Check local service readiness and key workspace paths.',
      enabled: true,
      id: 'status',
      label: 'Status',
      reasonDisabled: null,
      shellCommand: 'tools/bin/workspace-memory status',
    },
    {
      description: 'Save workspace docs and the current Codex thread into MemPalace.',
      enabled: true,
      id: 'save-workspace',
      label: 'Save workspace',
      reasonDisabled: null,
      shellCommand: 'tools/bin/workspace-memory save-workspace',
    },
    {
      description: 'Save the selected repo target plus the current Codex thread.',
      enabled: saveRepoEnabled,
      id: 'save-repo',
      label: 'Save repo',
      reasonDisabled: saveRepoEnabled ? null : 'Choose a repo target to enable repo closeout.',
      shellCommand: saveRepoCommand,
    },
    {
      description: 'Export the active Codex thread into a readable transcript bundle.',
      enabled: true,
      id: 'export-codex-current',
      label: 'Export current Codex thread',
      reasonDisabled: null,
      shellCommand: 'tools/bin/workspace-memory export-codex current',
    },
    {
      description: 'Mine the active Codex thread directly from the local session log.',
      enabled: true,
      id: 'mine-codex-current',
      label: 'Mine current Codex thread',
      reasonDisabled: null,
      shellCommand: 'tools/bin/workspace-memory mine-codex-current',
    },
    {
      description: 'Refresh the MemPalace wake-up summary from the current corpus.',
      enabled: true,
      id: 'wake-up',
      label: 'Wake-up',
      reasonDisabled: null,
      shellCommand: 'tools/bin/workspace-memory wake-up',
    },
    {
      description: 'Start the MemPalace MCP server for the workspace user.',
      enabled: serviceId === 'mempalace',
      id: 'runtime-start',
      label: 'Start MCP server',
      reasonDisabled: null,
      shellCommand: 'tools/bin/mempalace-start',
    },
    {
      description: 'Fast-forward the MemPalace fork from upstream when the tree is clean.',
      enabled: serviceId === 'mempalace',
      id: 'sync',
      label: 'Sync fork',
      reasonDisabled: null,
      shellCommand: 'tools/bin/mempalace-sync',
    },
  ]
}

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    generatedAt: new Date().toISOString(),
    port: apiPort,
    service: 'workspace-hub-api',
    status: 'ok',
    workspaceHub: getWorkspaceHubObservability(),
  })
})

app.get('/api/workspace/observability', (_request: Request, response: Response) => {
  response.json({
    generatedAt: new Date().toISOString(),
    ...getWorkspaceHubObservability(),
  })
})

app.get('/api/events', (request: Request, response: Response) => {
  handleWorkspaceEvents(request, response)
})

app.get(
  '/api/workspace/summary',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const reason = parseSummaryReason(request.query.reason)
      recordSummaryRequest(true, reason)
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
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const reason = parseSummaryReason(request.query.reason)
      recordSummaryRequest(false, reason)
      response.json(
        await buildWorkspaceSummary(
          apiPort,
          getInstallSnapshots(),
          getRuntimeSnapshots(),
          { includeDiagnostics: false, repoProjection: 'list' },
        ),
      )
    } catch (error) {
      next(error)
    }
  },
)

app.get(
  '/api/repos/details',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const relativePath =
        typeof request.query.relativePath === 'string' ? request.query.relativePath.trim() : ''

      if (!relativePath) {
        response.status(400).json({ message: 'A repo relative path is required.' })
        return
      }

      const repo = await buildWorkspaceRepoDetails(
        relativePath,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      if (!repo) {
        response.status(404).json({ message: 'Repo not found.' })
        return
      }

      response.json(repo)
    } catch (error) {
      next(error)
    }
  },
)

app.get(
  '/api/capabilities',
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      response.json(await buildWorkspaceCapabilitiesSnapshot())
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

      recordSummaryRequest(true, 'search')
      const summary = await buildWorkspaceSummary(
        apiPort,
        getInstallSnapshots(),
        getRuntimeSnapshots(),
      )

      response.json(
        await searchWorkspace(
          query,
          summary.repos,
          summary.coreServices,
          summary.capabilities,
        ),
      )
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/capabilities/action',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const capabilityId =
        typeof request.body?.capabilityId === 'string' ? request.body.capabilityId.trim() : ''
      const action =
        typeof request.body?.action === 'string' ? request.body.action.trim() : ''

      if (!capabilityId) {
        response.status(400).json({ message: 'A capability id is required.' })
        return
      }

      if (
        action !== 'disable' &&
        action !== 'enable' &&
        action !== 'install' &&
        action !== 'uninstall' &&
        action !== 'update'
      ) {
        response.status(400).json({ message: 'A valid capability action is required.' })
        return
      }

      const capability = await findWorkspaceCapability(capabilityId)

      if (!capability) {
        response.status(404).json({ message: 'Capability not found.' })
        return
      }

      const output = await runWorkspaceCapabilityAction(action, capabilityId)
      publishWorkspaceEvent({
        message: `${capability.name} ${action} completed`,
        relativePath: capability.installTarget,
        status: action === 'disable' ? 'disabled' : 'ready',
        type: 'capability',
      })
      invalidateWorkspaceCaches()
      response.json({ ok: true, output })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/capabilities/open',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const capabilityId =
        typeof request.body?.capabilityId === 'string' ? request.body.capabilityId.trim() : ''
      const target =
        typeof request.body?.target === 'string' ? request.body.target.trim() : ''

      if (!capabilityId) {
        response.status(400).json({ message: 'A capability id is required.' })
        return
      }

      const capability = await findWorkspaceCapability(capabilityId)

      if (!capability) {
        response.status(404).json({ message: 'Capability not found.' })
        return
      }

      if (target === 'repo') {
        if (!capability.installPath || !capability.installed) {
          response.status(400).json({ message: 'This capability is not installed locally.' })
          return
        }
        await openTarget(capability.installPath)
      } else if (target === 'docs') {
        if (!capability.docsPath) {
          response.status(400).json({ message: 'This capability does not have linked docs.' })
          return
        }
        await openTarget(capability.docsPath)
      } else if (target === 'readme') {
        if (!capability.readmePath) {
          response.status(400).json({ message: 'This capability does not have a linked README.' })
          return
        }
        await openTarget(capability.readmePath)
      } else {
        response.status(400).json({ message: 'Unsupported capability target.' })
        return
      }

      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/context',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''
      const targetKind = parseServiceTargetKind(request.body?.targetKind)
      const requestedRepoRelativePath = readOptionalRelativePath(request.body, 'repoRelativePath')
      const currentRepoRelativePath = readOptionalRelativePath(request.body, 'currentRepoRelativePath')

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      const resolvedRepoRelativePath =
        targetKind === 'repo'
          ? requestedRepoRelativePath
          : targetKind === 'current-repo'
            ? currentRepoRelativePath
            : null

      const resolvedRepo = resolvedRepoRelativePath
        ? await findWorkspaceRepo(
            resolvedRepoRelativePath,
            getInstallSnapshots(),
            getRuntimeSnapshots(),
          )
        : null

      const targetPath =
        targetKind === 'workspace-docs'
          ? path.join(workspaceRoot, 'docs')
          : resolvedRepo?.path ?? null

      const targetLabel =
        targetKind === 'workspace-docs'
          ? 'Workspace docs'
          : targetKind === 'current-repo'
            ? resolvedRepo?.name ?? 'Current repo'
            : resolvedRepo?.name ?? requestedRepoRelativePath ?? 'Selected repo'

      const metadataPath = targetPath
        ? path.join(targetPath, '.workspace', 'mempalace', 'mempalace.yaml')
        : null
      const metadataExists = metadataPath ? await fileExists(metadataPath) : false
      const lastRelevantIngestTarget =
        (targetMatchesPath(service.lastSaveTarget, targetPath) && service.lastSaveTarget) ||
        (targetMatchesPath(service.lastIngestTarget, targetPath) && service.lastIngestTarget) ||
        null
      const recommendedActionId =
        targetKind === 'workspace-docs'
          ? 'save-workspace'
          : resolvedRepo
            ? 'save-repo'
            : null
      const graph = await readMempalaceGraphSnapshot(service, {
        available: targetKind === 'workspace-docs' || Boolean(resolvedRepo),
        repoRelativePath: resolvedRepo?.relativePath ?? resolvedRepoRelativePath,
      })

      response.json({
        commands: buildMempalaceContextCommands(
          service.id,
          targetKind,
          resolvedRepo?.relativePath ?? resolvedRepoRelativePath,
          targetKind === 'workspace-docs' || Boolean(resolvedRepo),
        ),
        graph,
        lastRelevantIngestTarget,
        metadataExists,
        metadataPath,
        recommendedActionId,
        recommendedActionLabel:
          recommendedActionId === 'save-repo'
            ? 'Save repo memory now'
            : recommendedActionId === 'save-workspace'
              ? 'Save workspace memory now'
              : null,
        repoRelativePath: resolvedRepo?.relativePath ?? resolvedRepoRelativePath,
        serviceId: service.id,
        targetAvailable: targetKind === 'workspace-docs' || Boolean(resolvedRepo),
        targetKind,
        targetLabel,
        targetPath,
      })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/command',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''
      const commandId =
        typeof request.body?.commandId === 'string' ? request.body.commandId.trim() : ''
      const repoRelativePath = readOptionalRelativePath(request.body, 'repoRelativePath')
      const searchQuery = readOptionalString(request.body, 'searchQuery')

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      if (!commandId) {
        response.status(400).json({ message: 'A command id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      const result = await runCoreServiceCommand(service, commandId as WorkspaceCoreServiceCommandId, {
        repoRelativePath,
        searchQuery,
      })
      invalidateWorkspaceCaches()
      response.json({ ok: true, ...result })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/open',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''
      const target =
        typeof request.body?.target === 'string' ? request.body.target.trim() : ''
      const targetPath = readOptionalString(request.body, 'targetPath')

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      if (target === 'repo') {
        await openTarget(service.repoPath)
      } else if (target === 'docs') {
        if (!service.docsPath) {
          response.status(400).json({ message: 'This service does not have a linked docs path.' })
          return
        }
        await openTarget(service.docsPath)
      } else if (target === 'readme') {
        if (!service.readmePath) {
          response.status(400).json({ message: 'This service does not have a linked README.' })
          return
        }
        await openTarget(service.readmePath)
      } else if (target === 'storage') {
        await openTarget(service.sharedRoot)
      } else if (target === 'cache') {
        await openTarget(service.cacheRoot)
      } else if (target === 'exports') {
        await openTarget(service.exportsRoot)
      } else if (target === 'graph' || target === 'graph-folder') {
        if (!targetPath) {
          response.status(400).json({ message: 'A graph target path is required.' })
          return
        }
        if (!isPathWithinRoot(path.join(service.cacheRoot, 'graphs'), targetPath)) {
          response.status(400).json({ message: 'Graph targets must stay inside the service graph cache.' })
          return
        }
        if (!(await fileExists(targetPath))) {
          response.status(400).json({ message: 'The requested graph artifact does not exist yet.' })
          return
        }
        await openTarget(targetPath)
      } else if (target === 'terminal') {
        await openInTerminal(service.repoPath)
      } else {
        response.status(400).json({ message: 'Unknown service open target.' })
        return
      }

      invalidateWorkspaceCaches()
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/runtime',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''
      const action =
        typeof request.body?.action === 'string' ? request.body.action.trim() : ''

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      if (!canRunCoreService(service)) {
        response.status(400).json({ message: 'This service does not have a runtime command.' })
        return
      }

      if (action === 'start') {
        await startCoreService(service)
      } else if (action === 'stop') {
        await stopCoreService(service)
      } else if (action === 'restart') {
        await restartCoreService(service)
      } else {
        response.status(400).json({ message: 'Unknown service action.' })
        return
      }

      invalidateWorkspaceCaches()
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/install',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      if (!canInstallCoreService(service)) {
        response.status(400).json({ message: 'This service does not have an install command.' })
        return
      }

      await runCoreServiceInstall(service)
      invalidateWorkspaceCaches()
      response.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post(
  '/api/services/sync',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const serviceId =
        typeof request.body?.serviceId === 'string' ? request.body.serviceId.trim() : ''

      if (!serviceId) {
        response.status(400).json({ message: 'A service id is required.' })
        return
      }

      const service = await findCoreService(
        serviceId,
        getCoreServiceInstallSnapshots(),
        getCoreServiceRuntimeSnapshots(),
      )

      if (!service) {
        response.status(404).json({ message: 'Service not found.' })
        return
      }

      await runCoreServiceSync(service)
      invalidateWorkspaceCaches()
      response.json({ ok: true })
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
