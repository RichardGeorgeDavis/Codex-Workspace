import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { WorkspaceCoreService } from '../src/types/workspace.ts'

type GraphTargetOptions = {
  repoRelativePath?: string | null
}

function sanitizeGraphSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildMempalaceGraphTargetSlug(options: GraphTargetOptions = {}) {
  if (!options.repoRelativePath) {
    return 'workspace-docs'
  }

  const sanitized = sanitizeGraphSegment(options.repoRelativePath)
  return sanitized ? `repo-${sanitized}` : 'repo-target'
}

export function buildMempalaceGraphOutputDirectory(
  service: WorkspaceCoreService,
  options: GraphTargetOptions = {},
) {
  return path.join(service.cacheRoot, 'graphs', buildMempalaceGraphTargetSlug(options))
}

export type MempalaceGraphArtifactPaths = {
  htmlPath: string | null
  jsonPath: string | null
  reportPath: string | null
}

type MempalaceGraphDocument = {
  edges?: Array<{
    confidence?: number
    derived?: boolean
    type?: string
  }>
  generatedAt?: string
  nodes?: Array<{
    type?: string
  }>
  summary?: {
    edgeCount?: number
    nodeCount?: number
  }
}

export type MempalaceGraphSnapshot = {
  artifacts: MempalaceGraphArtifactPaths
  available: boolean
  derivedEdgeCount: number | null
  edgeCount: number | null
  lastBuiltAt: string | null
  nodeCount: number | null
  nodeTypeCounts: Partial<Record<string, number>>
  outputDirectory: string | null
  outputDirectoryExists: boolean
  reportExcerpt: string[]
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function readMempalaceGraphSnapshot(
  service: WorkspaceCoreService,
  options: GraphTargetOptions & { available: boolean },
): Promise<MempalaceGraphSnapshot> {
  if (!options.available) {
    return {
      artifacts: {
        htmlPath: null,
        jsonPath: null,
        reportPath: null,
      },
      available: false,
      derivedEdgeCount: null,
      edgeCount: null,
      lastBuiltAt: null,
      nodeCount: null,
      nodeTypeCounts: {},
      outputDirectory: null,
      outputDirectoryExists: false,
      reportExcerpt: [],
    }
  }

  const outputDirectory = buildMempalaceGraphOutputDirectory(service, options)
  const jsonPath = path.join(outputDirectory, 'graph.json')
  const htmlPath = path.join(outputDirectory, 'graph.html')
  const reportPath = path.join(outputDirectory, 'graph-report.md')
  const outputDirectoryExists = await fileExists(outputDirectory)
  const jsonExists = await fileExists(jsonPath)
  const htmlExists = await fileExists(htmlPath)
  const reportExists = await fileExists(reportPath)

  let document: MempalaceGraphDocument | null = null
  if (jsonExists) {
    try {
      document = JSON.parse(await readFile(jsonPath, 'utf8')) as MempalaceGraphDocument
    } catch {
      document = null
    }
  }

  let reportExcerpt: string[] = []
  if (reportExists) {
    try {
      reportExcerpt = (await readFile(reportPath, 'utf8'))
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
    } catch {
      reportExcerpt = []
    }
  }

  const nodeTypeCounts = Object.fromEntries(
    Object.entries(
      (document?.nodes ?? []).reduce<Record<string, number>>((counts, node) => {
        const type = typeof node.type === 'string' && node.type.trim() ? node.type.trim() : 'unknown'
        counts[type] = (counts[type] ?? 0) + 1
        return counts
      }, {}),
    ).sort(([left], [right]) => left.localeCompare(right)),
  )
  const derivedEdgeCount = document
    ? (document.edges ?? []).filter((edge) => edge.derived).length
    : null

  return {
    artifacts: {
      htmlPath: htmlExists ? htmlPath : null,
      jsonPath: jsonExists ? jsonPath : null,
      reportPath: reportExists ? reportPath : null,
    },
    available: true,
    derivedEdgeCount,
    edgeCount: typeof document?.summary?.edgeCount === 'number' ? document.summary.edgeCount : null,
    lastBuiltAt: document?.generatedAt ?? null,
    nodeCount: typeof document?.summary?.nodeCount === 'number' ? document.summary.nodeCount : null,
    nodeTypeCounts,
    outputDirectory,
    outputDirectoryExists,
    reportExcerpt,
  }
}
