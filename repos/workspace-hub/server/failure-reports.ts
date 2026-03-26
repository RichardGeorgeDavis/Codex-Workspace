import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  FailureKind,
  RepoFailureReportSummary,
  RepoInstall,
  RepoRuntime,
  WorkspaceRepo,
} from '../src/types/workspace.ts'

type FailureSnapshotRecord = {
  command: string | null
  endedAt: string | null
  exitCode: number | null
  logTail: string[]
  message: string | null
  signal: string | null
  startedAt: string | null
  status: string
  updatedAt: string | null
}

type FailureReportFile = {
  generatedAt: string
  git: WorkspaceRepo['git']
  health: WorkspaceRepo['health']
  kind: FailureKind
  repo: {
    collection: string
    name: string
    packageManager: string
    path: string
    preferredMode: WorkspaceRepo['preferredMode']
    previewUrl: string | null
    relativePath: string
    slug: string
    type: WorkspaceRepo['type']
  }
  snapshot: FailureSnapshotRecord
}

type StoredFailureReport = FailureReportFile & {
  filePath: string
  workspaceRelativePath: string
}

const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const reportsRoot = path.join(appRoot, 'data', 'failure-reports')

function sanitizeFileSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'report'
}

function buildSnapshotRecord(
  kind: FailureKind,
  snapshot: RepoInstall | RepoRuntime,
): FailureSnapshotRecord {
  const endedAt =
    kind === 'install'
      ? (snapshot as RepoInstall).finishedAt
      : (snapshot as RepoRuntime).stoppedAt

  return {
    command: snapshot.command,
    endedAt,
    exitCode: snapshot.lastExitCode,
    logTail: snapshot.logTail,
    message: snapshot.message,
    signal: snapshot.lastSignal,
    startedAt: snapshot.startedAt,
    status: snapshot.status,
    updatedAt: snapshot.updatedAt,
  }
}

function toStoredFailureReport(
  filePath: string,
  report: FailureReportFile,
): StoredFailureReport {
  return {
    ...report,
    filePath,
    workspaceRelativePath: path.relative(workspaceRoot, filePath),
  }
}

function toFailureReportSummary(
  report: StoredFailureReport,
): RepoFailureReportSummary {
  return {
    command: report.snapshot.command,
    exitCode: report.snapshot.exitCode,
    filePath: report.filePath,
    generatedAt: report.generatedAt,
    kind: report.kind,
    message: report.snapshot.message,
    signal: report.snapshot.signal,
    workspaceRelativePath: report.workspaceRelativePath,
  }
}

export async function writeFailureReport(
  repo: WorkspaceRepo,
  kind: FailureKind,
  snapshot: RepoInstall | RepoRuntime,
) {
  const generatedAt = new Date().toISOString()
  const report: FailureReportFile = {
    generatedAt,
    git: repo.git,
    health: repo.health,
    kind,
    repo: {
      collection: repo.collection,
      name: repo.name,
      packageManager: repo.packageManager,
      path: repo.path,
      preferredMode: repo.preferredMode,
      previewUrl: repo.previewUrl,
      relativePath: repo.relativePath,
      slug: repo.slug,
      type: repo.type,
    },
    snapshot: buildSnapshotRecord(kind, snapshot),
  }

  const fileName = [
    generatedAt.replace(/[:.]/g, '-'),
    sanitizeFileSegment(repo.relativePath),
    kind,
  ].join('-') + '.json'
  const filePath = path.join(reportsRoot, fileName)

  await mkdir(reportsRoot, { recursive: true })
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  return toStoredFailureReport(filePath, report)
}

async function readFailureReportFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, 'utf8')) as FailureReportFile

    if (
      typeof report.generatedAt !== 'string' ||
      typeof report.kind !== 'string' ||
      typeof report.repo?.relativePath !== 'string'
    ) {
      return null
    }

    return toStoredFailureReport(filePath, report)
  } catch {
    return null
  }
}

export async function readFailureReports() {
  try {
    const entries = await readdir(reportsRoot, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(reportsRoot, entry.name))

    const reports = await Promise.all(files.map((filePath) => readFailureReportFile(filePath)))
    return reports.filter((report): report is StoredFailureReport => Boolean(report))
  } catch {
    return []
  }
}

export async function readLatestFailureReports() {
  const reports = await readFailureReports()
  const latest = new Map<string, RepoFailureReportSummary>()

  for (const report of reports) {
    const current = latest.get(report.repo.relativePath)
    if (!current || Date.parse(report.generatedAt) > Date.parse(current.generatedAt)) {
      latest.set(report.repo.relativePath, toFailureReportSummary(report))
    }
  }

  return latest
}
