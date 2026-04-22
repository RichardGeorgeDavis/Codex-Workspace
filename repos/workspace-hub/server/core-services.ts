import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type {
  RepoInstall,
  RepoRuntime,
  WorkspaceCoreService,
  WorkspaceCoreServiceManifestIssue,
} from '../src/types/workspace.ts'
import {
  resolveWorkspaceCommand,
  resolveWorkspacePath,
} from './workspace-manifest-utils.ts'

type CoreServiceManifest = {
  capabilities?: Array<{
    cacheRoot?: string
    category?: string
    classification?: string
    docsPath?: string
    enabledByDefault?: boolean
    exposeInHub?: boolean
    id?: string
    installCommand?: unknown
    installMethod?: string
    installTarget?: string
    name?: string
    notes?: string
    runtimeCommand?: unknown
    sharedRoot?: string
    sourceUrl?: string
    syncCommand?: unknown
    updateStrategy?: string
  }>
}

type CoreServiceManifestEntry = NonNullable<CoreServiceManifest['capabilities']>[number]

const execFileAsync = promisify(execFile)
const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const manifestPath = path.join(workspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')
const loggedManifestIssueKeys = new Set<string>()
let lastCoreServiceManifestValidationAt: string | null = null
let lastCoreServiceManifestIssues: WorkspaceCoreServiceManifestIssue[] = []
let coreServiceManifestLoggedWarnings = 0

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
	}
}

type CoreServiceState = {
	exportsRoot?: string | null
	lastCommandAt?: string | null
	lastCommandKind?: string | null
	lastCommandTarget?: string | null
	lastCodexExportAt?: string | null
	lastCodexExportTarget?: string | null
	lastIngestAt?: string | null
	lastIngestTarget?: string | null
	lastInstallAt?: string | null
	lastRuntimeStartAt?: string | null
	lastSaveAt?: string | null
	lastSaveTarget?: string | null
	lastSearchAt?: string | null
	lastSearchQuery?: string | null
	lastSyncAt?: string | null
	lastWakeUpAt?: string | null
	updatedAt?: string | null
}

function sanitizeUser(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'default'
}

function detectWorkspaceUser() {
  if (process.env.CODEX_WORKSPACE_USER?.trim()) {
    return sanitizeUser(process.env.CODEX_WORKSPACE_USER.trim())
  }

  if (process.env.USER?.trim()) {
    return sanitizeUser(process.env.USER.trim())
  }

  try {
    return sanitizeUser(os.userInfo().username)
  } catch {
    return 'default'
  }
}

function buildIdleRuntime(command: string): RepoRuntime {
  return {
    command,
    lastExitCode: null,
    lastSignal: null,
    logTail: [],
    message: null,
    pid: null,
    startedAt: null,
    status: 'idle',
    stoppedAt: null,
    updatedAt: null,
  }
}

function buildIdleInstall(command: string): RepoInstall {
  return {
    command,
    finishedAt: null,
    lastExitCode: null,
    lastSignal: null,
    logTail: [],
    message: null,
    startedAt: null,
    status: 'idle',
    updatedAt: null,
  }
}

async function readManifest() {
  if (!(await fileExists(manifestPath))) {
    return { capabilities: [] } satisfies CoreServiceManifest
  }

  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as CoreServiceManifest
  } catch {
    return { capabilities: [] } satisfies CoreServiceManifest
	}
}

async function readState(statePath: string): Promise<CoreServiceState | null> {
	if (!(await fileExists(statePath))) {
		return null
	}

	try {
		return JSON.parse(await readFile(statePath, 'utf8')) as CoreServiceState
	} catch {
		return null
	}
}

async function readGitValue(repoPath: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, ...args], {
      maxBuffer: 1024 * 64,
      timeout: 1200,
    })
    const value = stdout.trim()
    return value || null
  } catch {
    return null
  }
}

async function readVersion(repoPath: string) {
  const pyprojectPath = path.join(repoPath, 'pyproject.toml')
  if (!(await fileExists(pyprojectPath))) {
    return null
  }

  try {
    const content = await readFile(pyprojectPath, 'utf8')
    const match = content.match(/^version\s*=\s*"([^"]+)"/m)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function buildCoreServiceManifestIssue(
  serviceConfig: CoreServiceManifestEntry | undefined,
  reason: string,
  remediation: string,
): WorkspaceCoreServiceManifestIssue {
  return {
    remediation,
    reason,
    serviceId: serviceConfig?.id?.trim() ?? null,
    serviceName: serviceConfig?.name?.trim() ?? null,
  }
}

function logCoreServiceManifestIssue(issue: WorkspaceCoreServiceManifestIssue) {
  const issueKey = `${issue.serviceId ?? 'unknown-id'}|${issue.serviceName ?? 'unknown-name'}|${issue.reason}`

  if (loggedManifestIssueKeys.has(issueKey)) {
    return
  }

  loggedManifestIssueKeys.add(issueKey)
  coreServiceManifestLoggedWarnings += 1
  console.warn(
    `[core-services] Skipping manifest entry${issue.serviceId ? ` ${issue.serviceId}` : ''}: ${issue.reason}`,
  )
}

export async function readCoreServices(
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const manifest = await readManifest()
  const user = detectWorkspaceUser()
  const services: WorkspaceCoreService[] = []
  const manifestIssues: WorkspaceCoreServiceManifestIssue[] = []

  for (const serviceConfig of manifest.capabilities ?? []) {
    if (serviceConfig.classification !== 'core-service') {
      continue
    }

    const id = serviceConfig.id?.trim()
    const name = serviceConfig.name?.trim()
    const repoPath = resolveWorkspacePath(workspaceRoot, serviceConfig.installTarget)
    const installCommand = resolveWorkspaceCommand(workspaceRoot, serviceConfig.installCommand)
    const runtimeCommand = resolveWorkspaceCommand(workspaceRoot, serviceConfig.runtimeCommand)
    const syncCommand = resolveWorkspaceCommand(workspaceRoot, serviceConfig.syncCommand)
    const sharedRootBase = resolveWorkspacePath(
      workspaceRoot,
      serviceConfig.sharedRoot?.trim() ?? (id ? path.join('shared', id) : null),
    )
    const cacheRootBase = resolveWorkspacePath(
      workspaceRoot,
      serviceConfig.cacheRoot?.trim() ?? (id ? path.join('cache', id) : null),
    )
    const docsPath = resolveWorkspacePath(workspaceRoot, serviceConfig.docsPath?.trim())

    if (!id) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Missing required service id.',
          'Add a unique `id` string to the core-service manifest entry.',
        ),
      )
      continue
    }

    if (!name) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Missing required service name.',
          'Add a display `name` for the core-service entry.',
        ),
      )
      continue
    }

    if (!serviceConfig.installTarget?.trim()) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Missing required install target.',
          'Set `installTarget` to a workspace-relative service repo path.',
        ),
      )
      continue
    }

    if (!repoPath) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Install target resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `installTarget` under the workspace root.',
        ),
      )
      continue
    }

    if (serviceConfig.docsPath?.trim() && !docsPath) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Docs path resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `docsPath` that stays inside the workspace.',
        ),
      )
      continue
    }

    if (!installCommand) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Install command must be a non-empty workspace-local argv array.',
          'Convert `installCommand` to a JSON string array such as `["tools/bin/workspace-memory", "install"]`.',
        ),
      )
      continue
    }

    if (!runtimeCommand) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Runtime command must be a non-empty workspace-local argv array.',
          'Convert `runtimeCommand` to a JSON string array rooted in the workspace.',
        ),
      )
      continue
    }

    if (!syncCommand) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Sync command must be a non-empty workspace-local argv array.',
          'Convert `syncCommand` to a JSON string array rooted in the workspace.',
        ),
      )
      continue
    }

    if (!sharedRootBase) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Shared root resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `sharedRoot` under `shared/`.',
        ),
      )
      continue
    }

    if (!cacheRootBase) {
      manifestIssues.push(
        buildCoreServiceManifestIssue(
          serviceConfig,
          'Cache root resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `cacheRoot` under `cache/`.',
        ),
      )
      continue
    }

    const normalizedRepoRelativePath = path.relative(workspaceRoot, repoPath).split(path.sep).join('/')
    const sharedRoot = path.join(sharedRootBase, user)
    const cacheRoot = path.join(cacheRootBase, user)
    const exportsRoot = path.join(sharedRoot, 'exports')
    const homePath = path.join(sharedRoot, 'home')
    const configPath = path.join(homePath, '.mempalace', 'config.json')
    const identityPath = path.join(homePath, '.mempalace', 'identity.txt')
    const statePath = path.join(sharedRoot, 'service-state.json')
    const readmePath = path.join(repoPath, 'README.md')
    const repoPresent = await fileExists(repoPath)
    const venvPath = path.join(repoPath, '.venv', 'bin', 'python')
    const venvReady = await fileExists(venvPath)
    const branch = repoPresent ? await readGitValue(repoPath, ['branch', '--show-current']) : null
    const originUrl = repoPresent ? await readGitValue(repoPath, ['remote', 'get-url', 'origin']) : null
    const upstreamUrl = repoPresent ? await readGitValue(repoPath, ['remote', 'get-url', 'upstream']) : null
    const version = repoPresent ? await readVersion(repoPath) : null
    const state = await readState(statePath)

    services.push({
      branch,
      cacheRoot,
      category: 'memory',
      configPath,
      description: 'Local long-term memory and retrieval service for Codex Workspace.',
      docsPath: docsPath && (await fileExists(docsPath)) ? docsPath : null,
      exportsRoot,
      homePath,
      id,
      identityPath,
      install: installSnapshots.get(id) ?? buildIdleInstall(installCommand.display),
      installCommand: installCommand.display,
      installCommandArgs: installCommand.args,
      lastCommandAt: state?.lastCommandAt ?? null,
      lastCommandKind: state?.lastCommandKind ?? null,
      lastCommandTarget: state?.lastCommandTarget ?? null,
      lastCodexExportAt: state?.lastCodexExportAt ?? null,
      lastCodexExportTarget: state?.lastCodexExportTarget ?? null,
      lastIngestAt: state?.lastIngestAt ?? null,
      lastIngestTarget: state?.lastIngestTarget ?? null,
      lastInstallAt: state?.lastInstallAt ?? null,
      lastRuntimeStartAt: state?.lastRuntimeStartAt ?? null,
      lastSaveAt: state?.lastSaveAt ?? null,
      lastSaveTarget: state?.lastSaveTarget ?? null,
      lastSearchAt: state?.lastSearchAt ?? null,
      lastSearchQuery: state?.lastSearchQuery ?? null,
      lastSyncAt: state?.lastSyncAt ?? null,
      lastWakeUpAt: state?.lastWakeUpAt ?? null,
      name,
      notes: serviceConfig.notes?.trim() ?? '',
      originUrl,
      readmePath: await fileExists(readmePath) ? readmePath : null,
      repoPath,
      repoPresent,
      repoRelativePath: normalizedRepoRelativePath,
      runtime: runtimeSnapshots.get(id) ?? buildIdleRuntime(runtimeCommand.display),
      runtimeCommand: runtimeCommand.display,
      runtimeCommandArgs: runtimeCommand.args,
      sharedRoot,
      statePath,
      syncCommand: syncCommand.display,
      syncCommandArgs: syncCommand.args,
      upstreamUrl,
      updatedAt: state?.updatedAt ?? null,
      user,
      venvPath,
      venvReady,
      version,
    } satisfies WorkspaceCoreService)
  }

  lastCoreServiceManifestValidationAt = new Date().toISOString()
  lastCoreServiceManifestIssues = manifestIssues

  for (const issue of manifestIssues) {
    logCoreServiceManifestIssue(issue)
  }

  return {
    manifestIssues,
    services,
  }
}

export function getWorkspaceCoreServicesObservability() {
  const manifestIssueReasons = Object.entries(
    lastCoreServiceManifestIssues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.reason] = (counts[issue.reason] ?? 0) + 1
      return counts
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right))

  return {
    lastValidatedAt: lastCoreServiceManifestValidationAt,
    loggedWarnings: coreServiceManifestLoggedWarnings,
    manifestIssueReasons: Object.fromEntries(manifestIssueReasons),
    rejectedEntries: lastCoreServiceManifestIssues.length,
  }
}

export async function findCoreService(
  serviceId: string,
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const { services } = await readCoreServices(installSnapshots, runtimeSnapshots)
  return services.find((service) => service.id === serviceId) ?? null
}
