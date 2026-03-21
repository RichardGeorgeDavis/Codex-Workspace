import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PreviewMode } from '../src/types/workspace.ts'

export type RepoMetadataInput = {
  buildCommand?: unknown
  devCommand?: unknown
  externalUrl?: unknown
  healthcheckUrl?: unknown
  notes?: unknown
  pinned?: unknown
  preferredMode?: unknown
  previewUrl?: unknown
  tags?: unknown
}

export type RepoActivityKind = 'install' | 'open' | 'runtime' | 'select'

export type StoredRepoMetadata = {
  buildCommand?: string
  devCommand?: string
  externalUrl?: string
  healthcheckUrl?: string
  lastActionAt?: string
  lastActionKind?: RepoActivityKind
  lastOpenedAt?: string
  lastSelectedAt?: string
  notes?: string
  pinned?: boolean
  preferredMode?: PreviewMode
  previewUrl?: string
  tags?: string[]
  updatedAt: string
}

type WorkspaceMetadataFile = {
  repos: Record<string, StoredRepoMetadata>
  version: 1
}

const previewModes: PreviewMode[] = ['direct', 'external', 'servbay']
const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const dataRoot = path.resolve(serverDir, '..', 'data')
const metadataFilePath = path.join(dataRoot, 'repo-metadata.json')
let metadataMutationQueue = Promise.resolve()

function isPreviewMode(value: unknown): value is PreviewMode {
  return typeof value === 'string' && previewModes.includes(value as PreviewMode)
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function isActivityKind(value: unknown): value is RepoActivityKind {
  return (
    value === 'install' ||
    value === 'open' ||
    value === 'runtime' ||
    value === 'select'
  )
}

function buildEmptyMetadataFile(): WorkspaceMetadataFile {
  return {
    repos: {},
    version: 1,
  }
}

function normalizeStoredMetadataEntry(entry: unknown): StoredRepoMetadata | null {
  if (typeof entry !== 'object' || entry === null) {
    return null
  }

  const candidate = entry as Record<string, unknown>
  const updatedAt =
    typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim().length > 0
      ? candidate.updatedAt
      : new Date().toISOString()

  return {
    buildCommand: normalizeOptionalString(candidate.buildCommand),
    devCommand: normalizeOptionalString(candidate.devCommand),
    externalUrl: normalizeOptionalString(candidate.externalUrl),
    healthcheckUrl: normalizeOptionalString(candidate.healthcheckUrl),
    lastActionAt: normalizeOptionalString(candidate.lastActionAt),
    lastActionKind: isActivityKind(candidate.lastActionKind)
      ? candidate.lastActionKind
      : undefined,
    lastOpenedAt: normalizeOptionalString(candidate.lastOpenedAt),
    lastSelectedAt: normalizeOptionalString(candidate.lastSelectedAt),
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined,
    pinned: typeof candidate.pinned === 'boolean' ? candidate.pinned : undefined,
    preferredMode: isPreviewMode(candidate.preferredMode)
      ? candidate.preferredMode
      : undefined,
    previewUrl: normalizeOptionalString(candidate.previewUrl),
    tags: Array.isArray(candidate.tags) ? normalizeTags(candidate.tags) : undefined,
    updatedAt,
  }
}

export async function readWorkspaceMetadata() {
  try {
    const raw = await readFile(metadataFilePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WorkspaceMetadataFile>
    const repos = Object.fromEntries(
      Object.entries(parsed.repos ?? {}).flatMap(([relativePath, entry]) => {
        const normalizedEntry = normalizeStoredMetadataEntry(entry)
        return normalizedEntry ? [[relativePath, normalizedEntry]] : []
      }),
    )

    return {
      repos,
      version: 1 as const,
    }
  } catch {
    return buildEmptyMetadataFile()
  }
}

async function writeWorkspaceMetadata(nextState: WorkspaceMetadataFile) {
  await mkdir(dataRoot, { recursive: true })
  await writeFile(metadataFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
}

function queueMetadataMutation<T>(
  mutator: (currentState: WorkspaceMetadataFile) => Promise<T>,
) {
  const run = metadataMutationQueue.then(async () => {
    const currentState = await readWorkspaceMetadata()
    return mutator(currentState)
  })

  metadataMutationQueue = run.then(
    () => undefined,
    () => undefined,
  )

  return run
}

export function normalizeMetadataInput(input: RepoMetadataInput) {
  return {
    buildCommand: normalizeOptionalString(input.buildCommand),
    devCommand: normalizeOptionalString(input.devCommand),
    externalUrl: normalizeOptionalString(input.externalUrl),
    healthcheckUrl: normalizeOptionalString(input.healthcheckUrl),
    notes: typeof input.notes === 'string' ? input.notes : undefined,
    pinned: typeof input.pinned === 'boolean' ? input.pinned : undefined,
    preferredMode: isPreviewMode(input.preferredMode) ? input.preferredMode : undefined,
    previewUrl: normalizeOptionalString(input.previewUrl),
    tags: Array.isArray(input.tags) ? normalizeTags(input.tags) : undefined,
    updatedAt: new Date().toISOString(),
  } satisfies StoredRepoMetadata
}

export async function saveRepoMetadata(
  relativePath: string,
  input: RepoMetadataInput,
) {
  return queueMetadataMutation(async (currentState) => {
    const existing = currentState.repos[relativePath]
    const nextState: WorkspaceMetadataFile = {
      ...currentState,
      repos: {
        ...currentState.repos,
        [relativePath]: {
          ...existing,
          ...normalizeMetadataInput(input),
        },
      },
    }

    await writeWorkspaceMetadata(nextState)

    return nextState.repos[relativePath]
  })
}

export async function saveRepoActivity(
  relativePath: string,
  kind: RepoActivityKind,
) {
  return queueMetadataMutation(async (currentState) => {
    const now = new Date().toISOString()
    const existing = currentState.repos[relativePath]
    const nextRecord: StoredRepoMetadata = {
      ...existing,
      lastActionAt: now,
      lastActionKind: kind,
      lastOpenedAt: kind === 'open' ? now : existing?.lastOpenedAt,
      lastSelectedAt: kind === 'select' ? now : existing?.lastSelectedAt,
      updatedAt: now,
    }

    const nextState: WorkspaceMetadataFile = {
      ...currentState,
      repos: {
        ...currentState.repos,
        [relativePath]: nextRecord,
      },
    }

    await writeWorkspaceMetadata(nextState)

    return nextRecord
  })
}

export async function resetRepoMetadata(relativePath: string) {
  await queueMetadataMutation(async (currentState) => {
    const nextRepos = { ...currentState.repos }
    delete nextRepos[relativePath]

    await writeWorkspaceMetadata({
      ...currentState,
      repos: nextRepos,
    })
  })
}

export function getMetadataFilePath() {
  return metadataFilePath
}
