import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  PreviewMode,
  RepoType,
  WorkspaceManifestRecord,
} from '../src/types/workspace.ts'

export type RepoManifestInput = {
  buildCommand?: unknown
  devCommand?: unknown
  externalUrl?: unknown
  healthcheckUrl?: unknown
  installCommand?: unknown
  name?: unknown
  notes?: unknown
  packageManager?: unknown
  preferredMode?: unknown
  previewCommand?: unknown
  previewUrl?: unknown
  servbayPath?: unknown
  servbaySubdomain?: unknown
  slug?: unknown
  tags?: unknown
  type?: unknown
}

const previewModes: PreviewMode[] = ['direct', 'external', 'servbay']
const repoTypes: RepoType[] = [
  'node-app',
  'other',
  'php',
  'static',
  'threejs',
  'vite',
  'wordpress',
]
const orderedManifestKeys = [
  'name',
  'slug',
  'type',
  'preferredMode',
  'packageManager',
  'installCommand',
  'devCommand',
  'buildCommand',
  'previewCommand',
  'previewUrl',
  'externalUrl',
  'healthcheckUrl',
  'servbayPath',
  'servbaySubdomain',
  'tags',
  'notes',
] as const

function isPreviewMode(value: unknown): value is PreviewMode {
  return typeof value === 'string' && previewModes.includes(value as PreviewMode)
}

function isRepoType(value: unknown): value is RepoType {
  return typeof value === 'string' && repoTypes.includes(value as RepoType)
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

async function readExistingManifest(manifestPath: string) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    throw new Error('Existing manifest is not valid JSON.')
  }
}

function orderManifest(manifest: Record<string, unknown>) {
  const orderedEntries: Array<[string, unknown]> = []

  for (const key of orderedManifestKeys) {
    if (key in manifest) {
      orderedEntries.push([key, manifest[key]])
    }
  }

  for (const key of Object.keys(manifest).sort()) {
    if (!orderedManifestKeys.includes(key as (typeof orderedManifestKeys)[number])) {
      orderedEntries.push([key, manifest[key]])
    }
  }

  return Object.fromEntries(orderedEntries)
}

export function normalizeManifestInput(input: RepoManifestInput) {
  const name = normalizeOptionalString(input.name)
  const slug = normalizeOptionalString(input.slug)

  if (!name) {
    throw new Error('Manifest name is required.')
  }

  if (!slug) {
    throw new Error('Manifest slug is required.')
  }

  if (!isRepoType(input.type)) {
    throw new Error('Manifest type is required.')
  }

  if (!isPreviewMode(input.preferredMode)) {
    throw new Error('Manifest preferredMode is required.')
  }

  const normalizedTags = normalizeTags(input.tags)
  const notes = normalizeOptionalString(input.notes)

  return {
    buildCommand: normalizeOptionalString(input.buildCommand),
    devCommand: normalizeOptionalString(input.devCommand),
    externalUrl: normalizeOptionalString(input.externalUrl),
    healthcheckUrl: normalizeOptionalString(input.healthcheckUrl),
    installCommand: normalizeOptionalString(input.installCommand),
    name,
    notes,
    packageManager: normalizeOptionalString(input.packageManager),
    preferredMode: input.preferredMode,
    previewCommand: normalizeOptionalString(input.previewCommand),
    previewUrl: normalizeOptionalString(input.previewUrl),
    servbayPath: normalizeOptionalString(input.servbayPath),
    servbaySubdomain: normalizeOptionalString(input.servbaySubdomain),
    slug,
    tags: normalizedTags.length ? normalizedTags : undefined,
    type: input.type,
  } satisfies WorkspaceManifestRecord
}

export async function writeRepoManifest(
  repoRoot: string,
  input: RepoManifestInput,
) {
  const manifestPath = path.join(repoRoot, '.workspace', 'project.json')
  const existingManifest = await readExistingManifest(manifestPath)
  const normalizedManifest = normalizeManifestInput(input)
  const nextManifest: Record<string, unknown> = { ...existingManifest }

  for (const key of orderedManifestKeys) {
    delete nextManifest[key]
  }

  for (const [key, value] of Object.entries(normalizedManifest)) {
    if (value !== undefined) {
      nextManifest[key] = value
    }
  }

  const orderedManifest = orderManifest(nextManifest)

  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(orderedManifest, null, 2)}\n`, 'utf8')

  return {
    manifest: orderedManifest,
    manifestPath,
  }
}
