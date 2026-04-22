import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

import type { RepoInstall, RepoRuntime, WorkspaceRepo } from '../src/types/workspace.ts'
import { writeFailureReport } from './failure-reports.ts'
import { publishWorkspaceEvent } from './live-events.ts'
import { invalidateWorkspaceSearchIndex } from './workspace-search.ts'

type ManagedRuntime = {
  child: ChildProcess
  lastFailureToken: string | null
  relativePath: string
  snapshot: RepoRuntime
}

type ManagedInstall = {
  child: ChildProcess
  lastFailureToken: string | null
  relativePath: string
  snapshot: RepoInstall
}

const managedRuntimes = new Map<string, ManagedRuntime>()
const managedInstalls = new Map<string, ManagedInstall>()
const maxLogLines = 40
const logEventDelayMs = 350
const pendingLogEvents = new Map<string, ReturnType<typeof setTimeout>>()

type SpawnCommand = {
  args: string[]
  command: string
}

function timestamp() {
  return new Date().toISOString()
}

function updateSnapshot(
  repoPath: string,
  mutator: (snapshot: RepoRuntime) => RepoRuntime,
) {
  const record = managedRuntimes.get(repoPath)

  if (!record) {
    return null
  }

  record.snapshot = mutator(record.snapshot)
  return record.snapshot
}

function updateInstallSnapshot(
  repoPath: string,
  mutator: (snapshot: RepoInstall) => RepoInstall,
) {
  const record = managedInstalls.get(repoPath)

  if (!record) {
    return null
  }

  record.snapshot = mutator(record.snapshot)
  return record.snapshot
}

function trimLogTail(lines: string[]) {
  return lines.slice(-maxLogLines)
}

function scheduleLogEvent(
  type: 'install-log' | 'runtime-log',
  relativePath: string,
  message: string,
) {
  const key = `${type}:${relativePath}`

  if (pendingLogEvents.has(key)) {
    return
  }

  pendingLogEvents.set(
    key,
    setTimeout(() => {
      pendingLogEvents.delete(key)
      publishWorkspaceEvent({
        message,
        relativePath,
        type,
      })
    }, logEventDelayMs),
  )
}

function buildFailureToken(snapshot: RepoInstall | RepoRuntime) {
  return [
    snapshot.status,
    snapshot.lastExitCode ?? '',
    snapshot.lastSignal ?? '',
    snapshot.message ?? '',
    snapshot.updatedAt ?? '',
  ].join(':')
}

async function persistFailureReportIfNeeded(
  kind: 'install' | 'runtime',
  repo: WorkspaceRepo,
  record: ManagedInstall | ManagedRuntime,
) {
  if (record.snapshot.status !== 'error') {
    return
  }

  const nextToken = buildFailureToken(record.snapshot)
  if (record.lastFailureToken === nextToken) {
    return
  }

  record.lastFailureToken = nextToken

  try {
    const report = await writeFailureReport(repo, kind, record.snapshot)
    invalidateWorkspaceSearchIndex('failure-report')
    publishWorkspaceEvent({
      message: report.workspaceRelativePath,
      relativePath: repo.relativePath,
      status: kind,
      type: 'failure-report',
    })
  } catch {
    // Failure reporting is helpful but should not block runtime control.
  }
}

function appendLog(repoPath: string, chunk: Buffer | string, stream: 'stdout' | 'stderr') {
  const text = chunk.toString().trim()

  if (!text) {
    return
  }

  const snapshot = updateSnapshot(repoPath, (currentSnapshot) => ({
    ...currentSnapshot,
    logTail: trimLogTail([
      ...currentSnapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
  }))

  const record = managedRuntimes.get(repoPath)
  if (record && snapshot) {
    scheduleLogEvent(
      'runtime-log',
      record.relativePath,
      text.split(/\r?\n/).at(-1) ?? `[${stream}] log updated`,
    )
  }
}

function appendInstallLog(
  repoPath: string,
  chunk: Buffer | string,
  stream: 'stdout' | 'stderr',
) {
  const text = chunk.toString().trim()

  if (!text) {
    return
  }

  const snapshot = updateInstallSnapshot(repoPath, (currentSnapshot) => ({
    ...currentSnapshot,
    logTail: trimLogTail([
      ...currentSnapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
  }))

  const record = managedInstalls.get(repoPath)
  if (record && snapshot) {
    scheduleLogEvent(
      'install-log',
      record.relativePath,
      text.split(/\r?\n/).at(-1) ?? `[${stream}] log updated`,
    )
  }
}

function createRunningSnapshot(repo: WorkspaceRepo): RepoRuntime {
  const now = timestamp()

  return {
    command: repo.devCommand,
    lastExitCode: null,
    lastSignal: null,
    logTail: [],
    message: null,
    pid: null,
    startedAt: now,
    status: 'running',
    stoppedAt: null,
    updatedAt: now,
  }
}

function createIdleInstall(command: string | null): RepoInstall {
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

function createRunningInstall(repo: WorkspaceRepo): RepoInstall {
  const now = timestamp()

  return {
    command: repo.installCommand,
    finishedAt: null,
    lastExitCode: null,
    lastSignal: null,
    logTail: [],
    message: null,
    startedAt: now,
    status: 'running',
    updatedAt: now,
  }
}

export function getRuntimeSnapshots() {
  return new Map(
    [...managedRuntimes.entries()].map(([repoPath, record]) => [repoPath, record.snapshot]),
  )
}

export function getInstallSnapshots() {
  return new Map(
    [...managedInstalls.entries()].map(([repoPath, record]) => [repoPath, record.snapshot]),
  )
}

export function canRunRepo(repo: WorkspaceRepo) {
  return Boolean(repo.devCommand)
}

export function canInstallRepo(repo: WorkspaceRepo) {
  return Boolean(repo.installCommand)
}

export async function startRepoRuntime(repo: WorkspaceRepo) {
  if (!repo.devCommand) {
    throw new Error('This repo does not have an inferred dev command yet.')
  }

  const existing = managedRuntimes.get(repo.path)
  if (existing?.snapshot.status === 'running') {
    return existing.snapshot
  }

  const child = spawn('sh', ['-lc', repo.devCommand], {
    cwd: repo.path,
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const snapshot = createRunningSnapshot(repo)
  snapshot.pid = child.pid ?? null

  managedRuntimes.set(repo.path, {
    child,
    lastFailureToken: null,
    relativePath: repo.relativePath,
    snapshot,
  })
  publishWorkspaceEvent({
    message: repo.devCommand ?? 'Runtime started.',
    relativePath: repo.relativePath,
    status: snapshot.status,
    type: 'runtime',
  })
  invalidateWorkspaceSearchIndex('runtime')

  child.stdout?.on('data', (chunk) => {
    appendLog(repo.path, chunk, 'stdout')
  })

  child.stderr?.on('data', (chunk) => {
    appendLog(repo.path, chunk, 'stderr')
  })

  child.on('error', (error) => {
    const nextSnapshot = updateSnapshot(repo.path, (currentSnapshot) => ({
      ...currentSnapshot,
      message: error.message,
      status: 'error',
      stoppedAt: timestamp(),
      updatedAt: timestamp(),
    }))

    publishWorkspaceEvent({
      message: error.message,
      relativePath: repo.relativePath,
      status: nextSnapshot?.status ?? 'error',
      type: 'runtime',
    })
    invalidateWorkspaceSearchIndex('runtime')

    const record = managedRuntimes.get(repo.path)
    if (record) {
      void persistFailureReportIfNeeded('runtime', repo, record)
    }
  })

  child.on('exit', (code, signal) => {
    const record = managedRuntimes.get(repo.path)
    if (!record) {
      return
    }

    const nextStatus =
      code === null || code === 0 ? 'stopped' : 'error'

    record.snapshot = {
      ...record.snapshot,
      lastExitCode: code,
      lastSignal: signal,
      message:
        code && code !== 0
          ? `Process exited with code ${code}.`
          : signal
            ? `Process stopped with signal ${signal}.`
            : null,
      pid: null,
      status: nextStatus,
      stoppedAt: timestamp(),
      updatedAt: timestamp(),
    }

    publishWorkspaceEvent({
      message: record.snapshot.message ?? undefined,
      relativePath: record.relativePath,
      status: record.snapshot.status,
      type: 'runtime',
    })
    invalidateWorkspaceSearchIndex('runtime')

    if (record.snapshot.status === 'error') {
      void persistFailureReportIfNeeded('runtime', repo, record)
    }
  })

  return snapshot
}

export async function stopRepoRuntime(repoPath: string) {
  const record = managedRuntimes.get(repoPath)
  if (!record) {
    throw new Error('This repo is not currently managed by Workspace Hub.')
  }

  if (record.snapshot.status !== 'running' || !record.snapshot.pid) {
    return record.snapshot
  }

  const processGroupId = -record.snapshot.pid

  try {
    process.kill(processGroupId, 'SIGTERM')
  } catch (error) {
    const nextSnapshot = updateSnapshot(repoPath, (snapshot) => ({
      ...snapshot,
      message:
        error instanceof Error ? error.message : 'Failed to stop process group.',
      status: 'error',
      updatedAt: timestamp(),
    }))
    const record = managedRuntimes.get(repoPath)
    publishWorkspaceEvent({
      message: nextSnapshot?.message ?? 'Failed to stop runtime.',
      relativePath: record?.relativePath ?? null,
      status: nextSnapshot?.status ?? 'error',
      type: 'runtime',
    })
    throw error
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      try {
        process.kill(processGroupId, 'SIGKILL')
      } catch {
        // Ignore if the process already exited.
      }

      resolve()
    }, 4000)

    record.child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })

  return managedRuntimes.get(repoPath)?.snapshot ?? null
}

export async function restartRepoRuntime(repo: WorkspaceRepo) {
  if (managedRuntimes.has(repo.path)) {
    await stopRepoRuntime(repo.path)
  }

  return startRepoRuntime(repo)
}

export async function runRepoInstall(repo: WorkspaceRepo) {
  if (!repo.installCommand) {
    throw new Error('This repo does not have an inferred install command yet.')
  }

  const existing = managedInstalls.get(repo.path)
  if (existing?.snapshot.status === 'running') {
    return existing.snapshot
  }

  const child = spawn('sh', ['-lc', repo.installCommand], {
    cwd: repo.path,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const snapshot = createRunningInstall(repo)

  managedInstalls.set(repo.path, {
    child,
    lastFailureToken: null,
    relativePath: repo.relativePath,
    snapshot,
  })
  publishWorkspaceEvent({
    message: repo.installCommand ?? 'Install started.',
    relativePath: repo.relativePath,
    status: snapshot.status,
    type: 'install',
  })
  invalidateWorkspaceSearchIndex('install')

  child.stdout?.on('data', (chunk) => {
    appendInstallLog(repo.path, chunk, 'stdout')
  })

  child.stderr?.on('data', (chunk) => {
    appendInstallLog(repo.path, chunk, 'stderr')
  })

  return await new Promise<RepoInstall>((resolve) => {
    let settled = false

    const settle = (nextSnapshot: RepoInstall) => {
      if (settled) {
        return
      }

      settled = true
      resolve(nextSnapshot)
    }

    child.on('error', (error) => {
      const nextSnapshot =
        updateInstallSnapshot(repo.path, (currentSnapshot) => ({
          ...currentSnapshot,
          finishedAt: timestamp(),
          message: error.message,
          status: 'error',
          updatedAt: timestamp(),
        })) ?? createIdleInstall(repo.installCommand)

      publishWorkspaceEvent({
        message: nextSnapshot.message ?? error.message,
        relativePath: repo.relativePath,
        status: nextSnapshot.status,
        type: 'install',
      })
      invalidateWorkspaceSearchIndex('install')

      const record = managedInstalls.get(repo.path)
      if (record) {
        void persistFailureReportIfNeeded('install', repo, record)
      }

      settle(nextSnapshot)
    })

    child.on('exit', (code, signal) => {
      const nextStatus = code === null || code === 0 ? 'succeeded' : 'error'
      const nextSnapshot =
        updateInstallSnapshot(repo.path, (currentSnapshot) => ({
          ...currentSnapshot,
          finishedAt: timestamp(),
          lastExitCode: code,
          lastSignal: signal,
          message:
            code === 0
              ? 'Install completed successfully.'
              : code
                ? `Install exited with code ${code}.`
                : signal
                  ? `Install stopped with signal ${signal}.`
                  : null,
          status: nextStatus,
          updatedAt: timestamp(),
        })) ?? createIdleInstall(repo.installCommand)

      publishWorkspaceEvent({
        message: nextSnapshot.message ?? undefined,
        relativePath: repo.relativePath,
        status: nextSnapshot.status,
        type: 'install',
      })
      invalidateWorkspaceSearchIndex('install')

      const record = managedInstalls.get(repo.path)
      if (record && nextSnapshot.status === 'error') {
        void persistFailureReportIfNeeded('install', repo, record)
      }

      settle(nextSnapshot)
    })
  })
}

export async function shutdownManagedRuntimes() {
  await Promise.all(
    [...managedRuntimes.keys()].map(async (repoPath) => {
      try {
        await stopRepoRuntime(repoPath)
      } catch {
        // Ignore shutdown failures.
      }
    }),
  )

  await Promise.all(
    [...managedInstalls.entries()].map(async ([repoPath, record]) => {
      try {
        record.child.kill('SIGTERM')
      } catch {
        // Ignore shutdown failures.
      }

      const snapshot = record.snapshot
      if (snapshot.status === 'running') {
        const nextSnapshot = updateInstallSnapshot(repoPath, (currentSnapshot) => ({
          ...currentSnapshot,
          finishedAt: timestamp(),
          message: currentSnapshot.message ?? 'Install stopped during shutdown.',
          status: 'error',
          updatedAt: timestamp(),
        }))

        publishWorkspaceEvent({
          message: nextSnapshot?.message ?? 'Install stopped during shutdown.',
          relativePath: record.relativePath,
          status: nextSnapshot?.status ?? 'error',
          type: 'install',
        })
        invalidateWorkspaceSearchIndex('install')
      }
    }),
  )
}

function hasShellCommand(command: string) {
  try {
    const probe = spawnSync('sh', ['-lc', `command -v ${command}`], {
      stdio: 'ignore',
    })
    return probe.status === 0
  } catch {
    return false
  }
}

export function resolveOpenTargetCommand(
  target: string,
  platform: NodeJS.Platform = process.platform,
): SpawnCommand {
  if (platform === 'darwin') {
    return {
      args: [target],
      command: 'open',
    }
  }

  if (platform === 'linux') {
    if (!hasShellCommand('xdg-open')) {
      throw new Error('No supported URL/file opener found on Linux (expected xdg-open).')
    }

    return {
      args: [target],
      command: 'xdg-open',
    }
  }

  if (platform === 'win32') {
    return {
      args: ['/c', 'start', '""', target],
      command: 'cmd',
    }
  }

  throw new Error(`Opening files is not supported on platform "${platform}".`)
}

export function resolveOpenInTerminalCommand(
  target: string,
  platform: NodeJS.Platform = process.platform,
): SpawnCommand {
  if (platform === 'darwin') {
    return {
      args: ['-a', 'Terminal', target],
      command: 'open',
    }
  }

  if (platform === 'linux') {
    if (hasShellCommand('x-terminal-emulator')) {
      return {
        args: ['--working-directory', target],
        command: 'x-terminal-emulator',
      }
    }

    if (hasShellCommand('gnome-terminal')) {
      return {
        args: ['--working-directory', target],
        command: 'gnome-terminal',
      }
    }

    if (hasShellCommand('konsole')) {
      return {
        args: ['--workdir', target],
        command: 'konsole',
      }
    }

    throw new Error(
      'No supported terminal launcher found on Linux (expected x-terminal-emulator, gnome-terminal, or konsole).',
    )
  }

  if (platform === 'win32') {
    return {
      args: ['/c', 'start', 'wt', '-d', target],
      command: 'cmd',
    }
  }

  throw new Error(`Opening terminal is not supported on platform "${platform}".`)
}

export function openTarget(target: string) {
  const opener = resolveOpenTargetCommand(target)
  const child = spawn(opener.command, opener.args, {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
}

export function openInTerminal(target: string) {
  const opener = resolveOpenInTerminalCommand(target)
  const child = spawn(opener.command, opener.args, {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
}
