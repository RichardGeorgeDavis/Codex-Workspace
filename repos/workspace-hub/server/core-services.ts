import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { RepoInstall, RepoRuntime, WorkspaceCoreService } from '../src/types/workspace.ts'

type CoreServiceManifest = {
  capabilities?: Array<{
    cacheRoot?: string
    category?: string
    classification?: string
    docsPath?: string
    enabledByDefault?: boolean
    exposeInHub?: boolean
    id?: string
    installCommand?: string
    installMethod?: string
    installTarget?: string
    name?: string
    notes?: string
    runtimeCommand?: string
    sharedRoot?: string
    sourceUrl?: string
    syncCommand?: string
    updateStrategy?: string
  }>
}

const execFileAsync = promisify(execFile)
const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const manifestPath = path.join(workspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')

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

export async function readCoreServices(
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const manifest = await readManifest()
  const user = detectWorkspaceUser()

  return await Promise.all(
    (manifest.capabilities ?? []).map(async (serviceConfig) => {
      const id = serviceConfig.id?.trim()
      const name = serviceConfig.name?.trim()
      const repoRelativePath = serviceConfig.installTarget?.trim()
      const installCommand = serviceConfig.installCommand?.trim()
      const runtimeCommand = serviceConfig.runtimeCommand?.trim()
      const syncCommand = serviceConfig.syncCommand?.trim()

      if (
        serviceConfig.classification !== 'core-service' ||
        !id ||
        !name ||
        !repoRelativePath ||
        !installCommand ||
        !runtimeCommand ||
        !syncCommand
      ) {
        return null
      }

      const repoPath = path.join(workspaceRoot, repoRelativePath)
      const sharedRoot = path.join(workspaceRoot, serviceConfig.sharedRoot ?? path.join('shared', id), user)
	      const cacheRoot = path.join(workspaceRoot, serviceConfig.cacheRoot ?? path.join('cache', id), user)
	      const exportsRoot = path.join(sharedRoot, 'exports')
	      const homePath = path.join(sharedRoot, 'home')
	      const configPath = path.join(homePath, '.mempalace', 'config.json')
	      const identityPath = path.join(homePath, '.mempalace', 'identity.txt')
	      const statePath = path.join(sharedRoot, 'service-state.json')
	      const docsPath = serviceConfig.docsPath
	        ? path.join(workspaceRoot, serviceConfig.docsPath)
	        : null
      const readmePath = path.join(repoPath, 'README.md')
      const repoPresent = await fileExists(repoPath)
      const venvPath = path.join(repoPath, '.venv', 'bin', 'python')
      const venvReady = await fileExists(venvPath)
	      const branch = repoPresent ? await readGitValue(repoPath, ['branch', '--show-current']) : null
	      const originUrl = repoPresent ? await readGitValue(repoPath, ['remote', 'get-url', 'origin']) : null
	      const upstreamUrl = repoPresent ? await readGitValue(repoPath, ['remote', 'get-url', 'upstream']) : null
	      const version = repoPresent ? await readVersion(repoPath) : null
	      const state = await readState(statePath)

	      return {
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
	        install: installSnapshots.get(id) ?? buildIdleInstall(installCommand),
	        installCommand: path.join(workspaceRoot, installCommand),
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
        repoRelativePath,
        runtime: runtimeSnapshots.get(id) ?? buildIdleRuntime(path.join(workspaceRoot, runtimeCommand)),
	        runtimeCommand: path.join(workspaceRoot, runtimeCommand),
	        sharedRoot,
	        statePath,
	        syncCommand: path.join(workspaceRoot, syncCommand),
	        upstreamUrl,
	        updatedAt: state?.updatedAt ?? null,
	        user,
	        venvPath,
	        venvReady,
        version,
      } satisfies WorkspaceCoreService
    }),
  ).then((services) => services.filter((service): service is WorkspaceCoreService => Boolean(service)))
}

export async function findCoreService(
  serviceId: string,
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const services = await readCoreServices(installSnapshots, runtimeSnapshots)
  return services.find((service) => service.id === serviceId) ?? null
}
