import { spawn, type ChildProcess } from 'node:child_process'

import type { RepoInstall, RepoRuntime, WorkspaceRepo } from '../src/types/workspace.ts'

type ManagedRuntime = {
  child: ChildProcess
  snapshot: RepoRuntime
}

type ManagedInstall = {
  child: ChildProcess
  snapshot: RepoInstall
}

const managedRuntimes = new Map<string, ManagedRuntime>()
const managedInstalls = new Map<string, ManagedInstall>()
const maxLogLines = 40

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

function appendLog(repoPath: string, chunk: Buffer | string, stream: 'stdout' | 'stderr') {
  const text = chunk.toString().trim()

  if (!text) {
    return
  }

  updateSnapshot(repoPath, (snapshot) => ({
    ...snapshot,
    logTail: trimLogTail([
      ...snapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
  }))
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

  updateInstallSnapshot(repoPath, (snapshot) => ({
    ...snapshot,
    logTail: trimLogTail([
      ...snapshot.logTail,
      ...text.split(/\r?\n/).map((line) => `[${stream}] ${line}`),
    ]),
    updatedAt: timestamp(),
  }))
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
    snapshot,
  })

  child.stdout?.on('data', (chunk) => {
    appendLog(repo.path, chunk, 'stdout')
  })

  child.stderr?.on('data', (chunk) => {
    appendLog(repo.path, chunk, 'stderr')
  })

  child.on('error', (error) => {
    updateSnapshot(repo.path, (currentSnapshot) => ({
      ...currentSnapshot,
      message: error.message,
      status: 'error',
      stoppedAt: timestamp(),
      updatedAt: timestamp(),
    }))
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
    updateSnapshot(repoPath, (snapshot) => ({
      ...snapshot,
      message:
        error instanceof Error ? error.message : 'Failed to stop process group.',
      status: 'error',
      updatedAt: timestamp(),
    }))
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
    snapshot,
  })

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
        updateInstallSnapshot(repoPath, (currentSnapshot) => ({
          ...currentSnapshot,
          finishedAt: timestamp(),
          message: currentSnapshot.message ?? 'Install stopped during shutdown.',
          status: 'error',
          updatedAt: timestamp(),
        }))
      }
    }),
  )
}

export function openTarget(target: string) {
  const child = spawn('open', [target], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
}

export function openInTerminal(target: string) {
  const child = spawn('open', ['-a', 'Terminal', target], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
}
