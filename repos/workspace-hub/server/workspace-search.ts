import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  WorkspaceRepo,
  WorkspaceSearchResponse,
  WorkspaceSearchResult,
} from '../src/types/workspace.ts'
import { readFailureReports } from './failure-reports.ts'

type SearchDocument = {
  category: WorkspaceSearchResult['category']
  filePath: string | null
  id: string
  repoRelativePath: string | null
  sources: Array<{
    label: string
    text: string
  }>
  subtitle: string
  title: string
  workspaceRelativePath: string | null
}

const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const artifactRoot = path.join(workspaceRoot, 'cache', 'context', 'agents', 'jobs')
const searchIndexTtlMs = 5000
const maxIndexedFileBytes = 24 * 1024
const maxArtifactFiles = 150

let cachedDocuments:
  | {
      docs: SearchDocument[]
      expiresAt: number
    }
  | null = null

function normalizeValue(value: string) {
  return value.toLowerCase()
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

async function readTextSnippet(targetPath: string) {
  try {
    const content = await readFile(targetPath, 'utf8')
    return content.slice(0, maxIndexedFileBytes)
  } catch {
    return ''
  }
}

async function walkArtifactFiles(rootPath: string, maxDepth: number) {
  const queue: Array<{ depth: number; targetPath: string }> = [
    { depth: 0, targetPath: rootPath },
  ]
  const results: string[] = []

  while (queue.length > 0 && results.length < maxArtifactFiles) {
    const nextEntry = queue.shift()
    if (!nextEntry) {
      break
    }

    try {
      const entries = await readdir(nextEntry.targetPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue
        }

        const fullPath = path.join(nextEntry.targetPath, entry.name)

        if (entry.isDirectory() && nextEntry.depth < maxDepth) {
          queue.push({
            depth: nextEntry.depth + 1,
            targetPath: fullPath,
          })
          continue
        }

        if (
          entry.isFile() &&
          /\.(json|jsonl|md|txt)$/i.test(entry.name)
        ) {
          results.push(fullPath)
        }

        if (results.length >= maxArtifactFiles) {
          break
        }
      }
    } catch {
      // Ignore unreadable directories.
    }
  }

  return results
}

function excerptAroundMatch(text: string, needle: string) {
  const normalizedText = normalizeValue(text)
  const index = normalizedText.indexOf(needle)
  if (index === -1) {
    return compactWhitespace(text).slice(0, 180)
  }

  const start = Math.max(0, index - 70)
  const end = Math.min(text.length, index + needle.length + 110)
  const excerpt = compactWhitespace(text.slice(start, end))

  if (start > 0 && end < text.length) {
    return `…${excerpt}…`
  }

  if (start > 0) {
    return `…${excerpt}`
  }

  if (end < text.length) {
    return `${excerpt}…`
  }

  return excerpt
}

function scoreDocument(
  doc: SearchDocument,
  normalizedQuery: string,
  terms: string[],
) {
  const normalizedTitle = normalizeValue(doc.title)
  const normalizedSubtitle = normalizeValue(doc.subtitle)
  const normalizedSources = doc.sources.map((source) => ({
    label: source.label,
    text: normalizeValue(source.text),
  }))

  let score = 0
  let bestMatchSource = ''
  let bestMatchText = ''

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 60
    bestMatchSource ||= 'title'
    bestMatchText ||= doc.title
  }

  if (normalizedSubtitle.includes(normalizedQuery)) {
    score += 30
    bestMatchSource ||= 'metadata'
    bestMatchText ||= doc.subtitle
  }

  for (const source of normalizedSources) {
    if (source.text.includes(normalizedQuery)) {
      score += 40
      bestMatchSource ||= source.label
      const originalSource = doc.sources.find((entry) => entry.label === source.label)
      bestMatchText ||= originalSource?.text ?? ''
      break
    }
  }

  for (const term of terms) {
    let matched = false

    if (normalizedTitle.includes(term)) {
      score += 20
      matched = true
      bestMatchSource ||= 'title'
      bestMatchText ||= doc.title
    }

    if (normalizedSubtitle.includes(term)) {
      score += 10
      matched = true
      bestMatchSource ||= 'metadata'
      bestMatchText ||= doc.subtitle
    }

    for (const source of normalizedSources) {
      if (source.text.includes(term)) {
        score += 8
        matched = true
        bestMatchSource ||= source.label
        const originalSource = doc.sources.find((entry) => entry.label === source.label)
        bestMatchText ||= originalSource?.text ?? ''
        break
      }
    }

    if (!matched) {
      return null
    }
  }

  if (score === 0) {
    return null
  }

  return {
    matchSource: bestMatchSource || 'content',
    score,
    snippet: excerptAroundMatch(bestMatchText || doc.subtitle || doc.title, normalizedQuery),
  }
}

async function buildRepoDocuments(repos: WorkspaceRepo[]) {
  return await Promise.all(
    repos.map(async (repo) => {
      const manifestText = repo.manifestPath ? await readTextSnippet(repo.manifestPath) : ''

      return {
        category: 'repo',
        filePath: repo.manifestPath ?? repo.readmePath,
        id: `repo:${repo.relativePath}`,
        repoRelativePath: repo.relativePath,
        sources: [
          { label: 'notes', text: repo.notes },
          { label: 'tags', text: repo.tags.join(' ') },
          { label: 'git', text: [repo.git.branch ?? '', repo.git.summary, repo.git.remoteUrl ?? ''].join(' ') },
          { label: 'dependencies', text: `${repo.dependencies.state} ${repo.dependencies.reason}` },
          { label: 'install log', text: repo.install.logTail.join('\n') },
          { label: 'runtime log', text: repo.runtime.logTail.join('\n') },
          { label: 'manifest', text: manifestText },
        ],
        subtitle: [repo.relativePath, repo.type, repo.packageManager || 'manual', repo.preferredMode]
          .filter(Boolean)
          .join(' • '),
        title: repo.name,
        workspaceRelativePath: repo.manifestPath
          ? path.relative(workspaceRoot, repo.manifestPath)
          : repo.readmePath
            ? path.relative(workspaceRoot, repo.readmePath)
            : repo.relativePath,
      } satisfies SearchDocument
    }),
  )
}

async function buildFailureDocuments() {
  const reports = await readFailureReports()

  return reports.map((report) => ({
    category: 'failure-report',
    filePath: report.filePath,
    id: `failure:${report.workspaceRelativePath}`,
    repoRelativePath: report.repo.relativePath,
    sources: [
      { label: 'message', text: report.snapshot.message ?? '' },
      { label: 'command', text: report.snapshot.command ?? '' },
      { label: 'git', text: [report.git.branch ?? '', report.git.summary, report.git.remoteUrl ?? ''].join(' ') },
      { label: 'log tail', text: report.snapshot.logTail.join('\n') },
    ],
    subtitle: [
      report.repo.relativePath,
      report.kind,
      report.generatedAt,
    ].join(' • '),
    title: `${report.repo.name} failure report`,
    workspaceRelativePath: report.workspaceRelativePath,
  }) satisfies SearchDocument)
}

async function buildArtifactDocuments() {
  const files = await walkArtifactFiles(artifactRoot, 4)

  return await Promise.all(
    files.map(async (filePath) => {
      const relativePath = path.relative(workspaceRoot, filePath)
      const content = await readTextSnippet(filePath)
      const segments = relativePath.split(path.sep)
      const jobName = segments.at(-2) ?? path.basename(filePath)

      return {
        category: 'artifact',
        filePath,
        id: `artifact:${relativePath}`,
        repoRelativePath: null,
        sources: [{ label: 'artifact', text: content }],
        subtitle: relativePath,
        title: `Agent job ${jobName}`,
        workspaceRelativePath: relativePath,
      } satisfies SearchDocument
    }),
  )
}

async function getSearchDocuments(repos: WorkspaceRepo[]) {
  if (cachedDocuments && cachedDocuments.expiresAt > Date.now()) {
    return cachedDocuments.docs
  }

  const docs = [
    ...(await buildRepoDocuments(repos)),
    ...(await buildFailureDocuments()),
    ...(await buildArtifactDocuments()),
  ]

  cachedDocuments = {
    docs,
    expiresAt: Date.now() + searchIndexTtlMs,
  }

  return docs
}

export async function searchWorkspace(
  query: string,
  repos: WorkspaceRepo[],
): Promise<WorkspaceSearchResponse> {
  const normalizedQuery = compactWhitespace(query).toLowerCase()

  if (!normalizedQuery) {
    return {
      query,
      results: [],
    }
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean)
  const docs = await getSearchDocuments(repos)

  const results = docs
    .map((doc) => {
      const scored = scoreDocument(doc, normalizedQuery, terms)
      if (!scored) {
        return null
      }

      return {
        category: doc.category,
        filePath: doc.filePath,
        id: doc.id,
        matchSource: scored.matchSource,
        repoRelativePath: doc.repoRelativePath,
        score: scored.score,
        snippet: scored.snippet,
        subtitle: doc.subtitle,
        title: doc.title,
        workspaceRelativePath: doc.workspaceRelativePath,
      } satisfies WorkspaceSearchResult
    })
    .filter((result): result is WorkspaceSearchResult => Boolean(result))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      return left.title.localeCompare(right.title)
    })
    .slice(0, 12)

  return {
    query,
    results,
  }
}
