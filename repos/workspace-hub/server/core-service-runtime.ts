import { spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  RepoInstall,
  RepoRuntime,
  WorkspaceCoreService,
  WorkspaceCoreServiceCommandId,
} from '../src/types/workspace.ts'
import { publishWorkspaceEvent } from './live-events.ts'

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
const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')

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
  const existing = managedRuntimes.get(service.id)
  if (existing?.snapshot.status === 'running') {
    throw new Error(`${service.name} is already running.`)
  }

  const child = spawn(service.runtimeCommand, [], {
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
  const existing = managedRuntimes.get(service.id)
  if (existing?.snapshot.status === 'running') {
    existing.child.kill('SIGTERM')
    managedRuntimes.delete(service.id)
  }

  await startCoreService(service)
}

export async function runCoreServiceInstall(service: WorkspaceCoreService) {
  const existing = managedInstalls.get(service.id)
  if (existing?.snapshot.status === 'running') {
    throw new Error(`${service.name} install is already running.`)
  }

  const child = spawn(service.installCommand, [], {
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
  })

  publishWorkspaceEvent({
    message: `${service.name} install started`,
    relativePath: service.repoRelativePath,
    status: 'running',
    type: 'service',
  })
}

export async function runCoreServiceSync(service: WorkspaceCoreService) {
  await execFileAsync(service.syncCommand, [], {
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
}

type CoreServiceCommandOptions = {
  repoRelativePath?: string | null
}

function buildCoreServiceCommandInvocation(
  service: WorkspaceCoreService,
  commandId: WorkspaceCoreServiceCommandId,
  options: CoreServiceCommandOptions,
) {
  if (service.id !== 'mempalace') {
    throw new Error(`Workspace commands are not configured for ${service.name}.`)
  }

  const wrapperPath = path.join(workspaceRoot, 'tools', 'bin', 'workspace-memory')

  switch (commandId) {
    case 'status':
      return { commandPath: wrapperPath, shellCommand: 'tools/bin/workspace-memory status', args: ['status'] }
    case 'save-workspace':
      return {
        commandPath: wrapperPath,
        shellCommand: 'tools/bin/workspace-memory save-workspace',
        args: ['save-workspace'],
      }
    case 'save-repo':
      if (!options.repoRelativePath) {
        throw new Error('A repo target is required for save-repo.')
      }
      return {
        commandPath: wrapperPath,
        shellCommand: `tools/bin/workspace-memory save-repo ${options.repoRelativePath}`,
        args: ['save-repo', options.repoRelativePath],
      }
    case 'export-codex-current':
      return {
        commandPath: wrapperPath,
        shellCommand: 'tools/bin/workspace-memory export-codex current',
        args: ['export-codex', 'current'],
      }
    case 'mine-codex-current':
      return {
        commandPath: wrapperPath,
        shellCommand: 'tools/bin/workspace-memory mine-codex-current',
        args: ['mine-codex-current'],
      }
    case 'wake-up':
      return {
        commandPath: wrapperPath,
        shellCommand: 'tools/bin/workspace-memory wake-up',
        args: ['wake-up'],
      }
    default:
      throw new Error(`Command ${commandId} should be handled by the dedicated runtime or sync flow.`)
  }
}

export async function runCoreServiceCommand(
  service: WorkspaceCoreService,
  commandId: WorkspaceCoreServiceCommandId,
  options: CoreServiceCommandOptions = {},
) {
  if (commandId === 'runtime-start') {
    await startCoreService(service)
    return {
      command: path.relative(workspaceRoot, service.runtimeCommand),
      output: '',
    }
  }

  if (commandId === 'sync') {
    await runCoreServiceSync(service)
    return {
      command: path.relative(workspaceRoot, service.syncCommand),
      output: '',
    }
  }

  const invocation = buildCoreServiceCommandInvocation(service, commandId, options)
  const { stdout, stderr } = await execFileAsync(invocation.commandPath, invocation.args, {
    cwd: workspaceRoot,
    env: process.env,
    maxBuffer: 1024 * 1024,
    timeout: 240000,
  })

  publishWorkspaceEvent({
    message: `${service.name} ${commandId} completed`,
    relativePath: service.repoRelativePath,
    status: 'ready',
    type: 'service',
  })

  return {
    command: invocation.shellCommand,
    output: [stdout.trim(), stderr.trim()].filter(Boolean).join('\n'),
  }
}
