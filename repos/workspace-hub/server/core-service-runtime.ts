import { spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'

import type {
  RepoInstall,
  RepoRuntime,
  WorkspaceCoreService,
} from '../src/types/workspace.ts'
import { publishWorkspaceEvent } from './live-events.ts'
import { invalidateWorkspaceSearchIndex } from './workspace-search.ts'

type ManagedServiceRuntime = {
  child: ChildProcess
  serviceId: string
  snapshot: RepoRuntime
}

type ManagedServiceInstall = {
  child: ChildProcess
  serviceId: string
  snapshot: RepoInstall
}

const managedRuntimes = new Map<string, ManagedServiceRuntime>()
const managedInstalls = new Map<string, ManagedServiceInstall>()
const maxLogLines = 40
const execFileAsync = promisify(execFile)

function timestamp() {
  return new Date().toISOString()
}

function trimLogTail(lines: string[]) {
  return lines.slice(-maxLogLines)
}

function appendRuntimeLog(serviceId: string, chunk: Buffer | string, stream: 'stdout' | 'stderr') {
  const record = managedRuntimes.get(serviceId)
  const text = chunk.toString().trim()

  if (!record || !text) {
    return
  }

  record.snapshot = {
    ...record.snapshot,
    logTail: trimLogTail([
      ...record.snapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
  }
}

function appendInstallLog(serviceId: string, chunk: Buffer | string, stream: 'stdout' | 'stderr') {
  const record = managedInstalls.get(serviceId)
  const text = chunk.toString().trim()

  if (!record || !text) {
    return
  }

  record.snapshot = {
    ...record.snapshot,
    logTail: trimLogTail([
      ...record.snapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
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

function serviceMaintenancePausedReason(service: WorkspaceCoreService) {
  return service.maintenancePaused ? service.maintenancePausedReason : null
}

function assertServiceMaintenanceAvailable(service: WorkspaceCoreService) {
  const pausedReason = serviceMaintenancePausedReason(service)

  if (pausedReason) {
    throw new Error(pausedReason)
  }
}

export function getCoreServiceRuntimeSnapshots() {
  return new Map(
    [...managedRuntimes.entries()].map(([serviceId, record]) => [serviceId, record.snapshot]),
  )
}

export function getCoreServiceInstallSnapshots() {
  return new Map(
    [...managedInstalls.entries()].map(([serviceId, record]) => [serviceId, record.snapshot]),
  )
}

export function canRunCoreService(service: WorkspaceCoreService) {
  return Boolean(service.runtimeCommand)
}

export function canInstallCoreService(service: WorkspaceCoreService) {
  return Boolean(service.installCommand)
}

export async function startCoreService(service: WorkspaceCoreService) {
  assertServiceMaintenanceAvailable(service)

  const existing = managedRuntimes.get(service.id)
  if (existing?.snapshot.status === 'running') {
    throw new Error(`${service.name} is already running.`)
  }

  const child = spawn(service.runtimeCommandArgs[0], service.runtimeCommandArgs.slice(1), {
    cwd: service.repoPresent ? service.repoPath : undefined,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const snapshot: RepoRuntime = {
    ...buildIdleRuntime(service.runtimeCommand),
    pid: child.pid ?? null,
    startedAt: timestamp(),
    status: 'running',
    updatedAt: timestamp(),
  }

  managedRuntimes.set(service.id, {
    child,
    serviceId: service.id,
    snapshot,
  })

  child.stdout?.on('data', (chunk) => {
    appendRuntimeLog(service.id, chunk, 'stdout')
  })
  child.stderr?.on('data', (chunk) => {
    appendRuntimeLog(service.id, chunk, 'stderr')
  })

  child.on('exit', (exitCode, signal) => {
    const record = managedRuntimes.get(service.id)
    if (!record) {
      return
    }

    record.snapshot = {
      ...record.snapshot,
      lastExitCode: exitCode,
      lastSignal: signal,
      message: exitCode === 0 ? `${service.name} stopped.` : `${service.name} exited unexpectedly.`,
      pid: null,
      status: exitCode === 0 || signal === 'SIGTERM' ? 'stopped' : 'error',
      stoppedAt: timestamp(),
      updatedAt: timestamp(),
    }

    publishWorkspaceEvent({
      message: record.snapshot.message ?? service.name,
      relativePath: service.repoRelativePath,
      status: record.snapshot.status,
      type: 'service',
    })
  })

  publishWorkspaceEvent({
    message: `${service.name} started`,
    relativePath: service.repoRelativePath,
    status: 'running',
    type: 'service',
  })
}

export async function stopCoreService(service: WorkspaceCoreService) {
  assertServiceMaintenanceAvailable(service)

  const record = managedRuntimes.get(service.id)
  if (!record || record.snapshot.status !== 'running') {
    throw new Error(`${service.name} is not running.`)
  }

  record.child.kill('SIGTERM')
  record.snapshot = {
    ...record.snapshot,
    message: `${service.name} stopping...`,
    updatedAt: timestamp(),
  }

  publishWorkspaceEvent({
    message: `${service.name} stopping`,
    relativePath: service.repoRelativePath,
    status: 'stopping',
    type: 'service',
  })
}

export async function restartCoreService(service: WorkspaceCoreService) {
  assertServiceMaintenanceAvailable(service)

  const existing = managedRuntimes.get(service.id)
  if (existing?.snapshot.status === 'running') {
    existing.child.kill('SIGTERM')
    managedRuntimes.delete(service.id)
  }

  await startCoreService(service)
}

export async function runCoreServiceInstall(service: WorkspaceCoreService) {
  assertServiceMaintenanceAvailable(service)

  const existing = managedInstalls.get(service.id)
  if (existing?.snapshot.status === 'running') {
    throw new Error(`${service.name} install is already running.`)
  }

  const child = spawn(service.installCommandArgs[0], service.installCommandArgs.slice(1), {
    cwd: service.repoPresent ? service.repoPath : undefined,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const snapshot: RepoInstall = {
    ...buildIdleInstall(service.installCommand),
    startedAt: timestamp(),
    status: 'running',
    updatedAt: timestamp(),
  }

  managedInstalls.set(service.id, {
    child,
    serviceId: service.id,
    snapshot,
  })

  child.stdout?.on('data', (chunk) => {
    appendInstallLog(service.id, chunk, 'stdout')
  })
  child.stderr?.on('data', (chunk) => {
    appendInstallLog(service.id, chunk, 'stderr')
  })

  child.on('exit', (exitCode, signal) => {
    const record = managedInstalls.get(service.id)
    if (!record) {
      return
    }

    record.snapshot = {
      ...record.snapshot,
      finishedAt: timestamp(),
      lastExitCode: exitCode,
      lastSignal: signal,
      message: exitCode === 0 ? `${service.name} install completed.` : `${service.name} install failed.`,
      status: exitCode === 0 ? 'succeeded' : 'error',
      updatedAt: timestamp(),
    }

    publishWorkspaceEvent({
      message: record.snapshot.message ?? service.name,
      relativePath: service.repoRelativePath,
      status: record.snapshot.status,
      type: 'service',
    })
    invalidateWorkspaceSearchIndex('core-service-install')
  })

  publishWorkspaceEvent({
    message: `${service.name} install started`,
    relativePath: service.repoRelativePath,
    status: 'running',
    type: 'service',
  })
}

export async function runCoreServiceSync(service: WorkspaceCoreService) {
  assertServiceMaintenanceAvailable(service)

  await execFileAsync(service.syncCommandArgs[0], service.syncCommandArgs.slice(1), {
    cwd: service.repoPresent ? service.repoPath : undefined,
    env: process.env,
    maxBuffer: 1024 * 512,
    timeout: 120000,
  })

  publishWorkspaceEvent({
    message: `${service.name} sync completed`,
    relativePath: service.repoRelativePath,
    status: 'ready',
    type: 'service',
  })
  invalidateWorkspaceSearchIndex('core-service-sync')
}
