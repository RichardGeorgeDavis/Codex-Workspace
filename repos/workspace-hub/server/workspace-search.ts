import { open, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  WorkspaceCapability,
  WorkspaceCoreService,
  WorkspaceRepo,
  WorkspaceSearchResponse,
  WorkspaceSearchResult,
} from '../src/types/workspace.ts'
import { readFailureReports } from './failure-reports.ts'

type WorkspaceSearchMode = WorkspaceSearchResponse['mode']

type SearchDocument = {
  category: WorkspaceSearchResult['category']
  filePath: string | null
  id: string
  capabilityId: string | null
  repoRelativePath: string | null
  serviceId: string | null
  sources: Array<{
    label: string
    text: string
  }>
  subtitle: string
  title: string
  workspaceRelativePath: string | null
}

type RepoSideLoadSummary = {
  abstract: string
  entry: string
  overview: string
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
const searchResponseCacheTtlMs = 3000
const maxIndexedFileBytes = 24 * 1024
const maxArtifactFiles = 150
const includeArtifactSearch = (() => {
  const raw = process.env.WORKSPACE_HUB_SEARCH_INCLUDE_ARTIFACTS?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
})()

const cachedDocuments = new Map<
  WorkspaceSearchMode,
  {
    docs: SearchDocument[]
    expiresAt: number
  }
>()
const cachedResponses = new Map<
  string,
  {
    expiresAt: number
    response: WorkspaceSearchResponse
  }
>()
let searchRequests = 0
let searchLastDurationMs: number | null = null
let searchMaxDurationMs = 0
let searchTotalDurationMs = 0
let searchResultCountTotal = 0
let searchDocumentCacheHits = 0
let searchDocumentCacheMisses = 0
let searchResponseCacheHits = 0
let searchResponseCacheMisses = 0
let searchIndexRevision = 0
let searchIndexInvalidations = 0
let searchLastInvalidatedAt: string | null = null

function buildSearchResponseCacheKey(query: string, mode: WorkspaceSearchMode) {
  return `${searchIndexRevision}:${mode}:${compactWhitespace(query).toLowerCase()}`
}

function normalizeValue(value: string) {
  return value.toLowerCase()
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

async function readTextSnippet(targetPath: string) {
  try {
    const handle = await open(targetPath, 'r')

    try {
      const buffer = Buffer.alloc(maxIndexedFileBytes)
      const { bytesRead } = await handle.read(buffer, 0, maxIndexedFileBytes, 0)
      return buffer.toString('utf8', 0, bytesRead)
    } finally {
      await handle.close()
    }
  } catch {
    return ''
  }
}

async function readRepoSideLoadSummary(repoRelativePath: string): Promise<RepoSideLoadSummary> {
  const repoName = path.basename(repoRelativePath)
  const sideLoadRoot = path.join(workspaceRoot, 'cache', 'context', 'repos', repoName)
  const [abstract, entry, overview] = await Promise.all([
    readTextSnippet(path.join(sideLoadRoot, 'abstract.md')),
    readTextSnippet(path.join(sideLoadRoot, 'entry.md')),
    readTextSnippet(path.join(sideLoadRoot, 'overview.md')),
  ])

  return { abstract, entry, overview }
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

async function buildRepoDocuments(repos: WorkspaceRepo[], mode: WorkspaceSearchMode) {
  return await Promise.all(
    repos.map(async (repo) => {
      const [manifestText, readmeText, sideLoad] = await Promise.all([
        repo.manifestPath ? readTextSnippet(repo.manifestPath) : Promise.resolve(''),
        repo.readmePath ? readTextSnippet(repo.readmePath) : Promise.resolve(''),
        readRepoSideLoadSummary(repo.relativePath),
      ])
      const thinSources = [
        { label: 'notes', text: repo.notes },
        { label: 'tags', text: repo.tags.join(' ') },
        {
          label: 'routing',
          text: [repo.relativePath, repo.type, repo.packageManager || 'manual', repo.preferredMode].join(' '),
        },
        { label: 'dependencies', text: `${repo.dependencies.state} ${repo.dependencies.reason}` },
        { label: 'context abstract', text: sideLoad.abstract },
        { label: 'context entry', text: sideLoad.entry },
        { label: 'context overview', text: sideLoad.overview },
        { label: 'manifest', text: manifestText },
      ]
      const deepSources = [
        ...thinSources,
        { label: 'git', text: [repo.git.branch ?? '', repo.git.summary, repo.git.remoteUrl ?? ''].join(' ') },
        { label: 'install log', text: repo.install.logTail.join('\n') },
        { label: 'runtime log', text: repo.runtime.logTail.join('\n') },
        { label: 'readme', text: readmeText },
      ]

      return {
        category: 'repo',
        capabilityId: null,
        filePath: repo.manifestPath ?? repo.readmePath,
        id: `repo:${repo.relativePath}`,
        repoRelativePath: repo.relativePath,
        serviceId: null,
        sources: mode === 'deep' ? deepSources : thinSources,
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

async function buildCoreServiceDocuments(
  services: WorkspaceCoreService[],
  mode: WorkspaceSearchMode,
) {
  return await Promise.all(
    services.map(async (service) => {
      const readmeText = service.readmePath ? await readTextSnippet(service.readmePath) : ''
      const docsText = service.docsPath ? await readTextSnippet(service.docsPath) : ''

      return {
        category: 'service',
        capabilityId: null,
        filePath: service.docsPath ?? service.readmePath ?? service.repoPath,
        id: `service:${service.id}`,
        repoRelativePath: null,
        serviceId: service.id,
        sources: [
          { label: 'description', text: service.description },
          { label: 'notes', text: service.notes },
          { label: 'commands', text: [service.installCommand, service.runtimeCommand, service.syncCommand].join(' ') },
          { label: 'storage', text: [service.sharedRoot, service.cacheRoot, service.configPath].join(' ') },
          ...(mode === 'deep'
            ? [
                { label: 'readme', text: readmeText },
                { label: 'docs', text: docsText },
              ]
            : []),
        ],
        subtitle: [service.repoRelativePath, service.category, service.user, service.version ?? 'unversioned']
          .filter(Boolean)
          .join(' • '),
        title: service.name,
        workspaceRelativePath: path.relative(
          workspaceRoot,
          service.docsPath ?? service.readmePath ?? service.repoPath,
        ),
      } satisfies SearchDocument
    }),
  )
}

async function buildCapabilityDocuments(
  capabilities: WorkspaceCapability[],
  mode: WorkspaceSearchMode,
) {
  return await Promise.all(
    capabilities
      .filter(
        (capability) =>
          capability.exposeInHub && capability.classification !== 'core-service',
      )
      .map(async (capability) => {
        const readmeText = capability.readmePath
          ? await readTextSnippet(capability.readmePath)
          : ''
        const docsText = capability.docsPath ? await readTextSnippet(capability.docsPath) : ''

        return {
          category: 'capability',
          capabilityId: capability.id,
          filePath: capability.docsPath ?? capability.readmePath ?? capability.installPath,
          id: `capability:${capability.id}`,
          repoRelativePath: null,
          serviceId: null,
          sources: [
            { label: 'description', text: capability.description },
            { label: 'notes', text: capability.notes },
            { label: 'usage', text: capability.repoUsageNotes },
            { label: 'source', text: [capability.sourceUrl, capability.installTarget].join(' ') },
            {
              label: 'state',
              text: [
                capability.classification,
                capability.installMethod,
                capability.updateStrategy,
                capability.enabled ? 'enabled' : 'disabled',
                capability.installed ? 'installed' : 'not installed',
              ].join(' '),
            },
            ...(mode === 'deep'
              ? [
                  { label: 'readme', text: readmeText },
                  { label: 'docs', text: docsText },
                ]
              : []),
          ],
          subtitle: [
            capability.classification,
            capability.installTarget,
            capability.enabled ? 'enabled' : 'disabled',
            capability.installed ? 'installed' : 'not installed',
          ].join(' • '),
          title: capability.name,
          workspaceRelativePath: capability.docsPath
            ? path.relative(workspaceRoot, capability.docsPath)
            : capability.readmePath
              ? path.relative(workspaceRoot, capability.readmePath)
              : capability.installTarget,
        } satisfies SearchDocument
      }),
  )
}

async function buildFailureDocuments(mode: WorkspaceSearchMode) {
  const reports = await readFailureReports()

  return reports.map((report) => ({
	    category: 'failure-report',
      capabilityId: null,
	    filePath: report.filePath,
	    id: `failure:${report.workspaceRelativePath}`,
	    repoRelativePath: report.repo.relativePath,
	    serviceId: null,
	    sources: [
      { label: 'message', text: report.snapshot.message ?? '' },
      { label: 'command', text: report.snapshot.command ?? '' },
      { label: 'git', text: [report.git.branch ?? '', report.git.summary, report.git.remoteUrl ?? ''].join(' ') },
      ...(mode === 'deep'
        ? [{ label: 'log tail', text: report.snapshot.logTail.join('\n') }]
        : []),
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

async function buildArtifactDocuments(mode: WorkspaceSearchMode) {
  if (!includeArtifactSearch || mode !== 'deep') {
    return []
  }

  const files = await walkArtifactFiles(artifactRoot, 4)

  return await Promise.all(
    files.map(async (filePath) => {
      const relativePath = path.relative(workspaceRoot, filePath)
      const content = await readTextSnippet(filePath)
      const segments = relativePath.split(path.sep)
      const jobName = segments.at(-2) ?? path.basename(filePath)

      return {
	        category: 'artifact',
          capabilityId: null,
	        filePath,
	        id: `artifact:${relativePath}`,
	        repoRelativePath: null,
	        serviceId: null,
	        sources: [{ label: 'artifact', text: content }],
        subtitle: relativePath,
        title: `Agent job ${jobName}`,
        workspaceRelativePath: relativePath,
      } satisfies SearchDocument
    }),
  )
}

async function getSearchDocuments(
  repos: WorkspaceRepo[],
  services: WorkspaceCoreService[],
  capabilities: WorkspaceCapability[],
  mode: WorkspaceSearchMode,
) {
  const cached = cachedDocuments.get(mode)
  if (cached && cached.expiresAt > Date.now()) {
    searchDocumentCacheHits += 1
    return cached.docs
  }

  searchDocumentCacheMisses += 1

  const docs = [
    ...(await buildRepoDocuments(repos, mode)),
    ...(await buildCoreServiceDocuments(services, mode)),
    ...(await buildCapabilityDocuments(capabilities, mode)),
    ...(await buildFailureDocuments(mode)),
    ...(await buildArtifactDocuments(mode)),
  ]

  cachedDocuments.set(mode, {
    docs,
    expiresAt: Date.now() + searchIndexTtlMs,
  })

  return docs
}

export function getWorkspaceSearchObservability() {
  return {
    avgDurationMs:
      searchRequests > 0
        ? Number((searchTotalDurationMs / searchRequests).toFixed(2))
        : null,
    documentCacheHits: searchDocumentCacheHits,
    documentCacheMisses: searchDocumentCacheMisses,
    documentCacheSize: cachedDocuments.size,
    documentCacheTtlMs: searchIndexTtlMs,
    indexRevision: searchIndexRevision,
    invalidations: searchIndexInvalidations,
    lastDurationMs: searchLastDurationMs,
    lastInvalidatedAt: searchLastInvalidatedAt,
    maxDurationMs: searchRequests > 0 ? searchMaxDurationMs : null,
    responseCacheHits: searchResponseCacheHits,
    responseCacheMisses: searchResponseCacheMisses,
    responseCacheSize: cachedResponses.size,
    responseCacheTtlMs: searchResponseCacheTtlMs,
    requests: searchRequests,
    totalResultsReturned: searchResultCountTotal,
  }
}

export function getCachedWorkspaceSearchResponse(
  query: string,
  mode: WorkspaceSearchMode,
) {
  const cacheKey = buildSearchResponseCacheKey(query, mode)
  const cached = cachedResponses.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    searchResponseCacheHits += 1
    return cached.response
  }

  searchResponseCacheMisses += 1
  cachedResponses.delete(cacheKey)
  return null
}

export function storeWorkspaceSearchResponse(response: WorkspaceSearchResponse) {
  const cacheKey = buildSearchResponseCacheKey(response.query, response.mode)
  cachedResponses.set(cacheKey, {
    expiresAt: Date.now() + searchResponseCacheTtlMs,
    response,
  })
}

export function invalidateWorkspaceSearchIndex(_reason = 'event') {
  searchIndexRevision += 1
  searchIndexInvalidations += 1
  searchLastInvalidatedAt = new Date().toISOString()
  cachedDocuments.clear()
  cachedResponses.clear()
}

export async function searchWorkspace(
  query: string,
  repos: WorkspaceRepo[],
  services: WorkspaceCoreService[] = [],
  capabilities: WorkspaceCapability[] = [],
  mode: WorkspaceSearchMode = 'thin',
): Promise<WorkspaceSearchResponse> {
  searchRequests += 1
  const startedAt = Date.now()
  const normalizedQuery = compactWhitespace(query).toLowerCase()

  if (!normalizedQuery) {
    const durationMs = Date.now() - startedAt
    searchLastDurationMs = durationMs
    searchTotalDurationMs += durationMs
    searchMaxDurationMs = Math.max(searchMaxDurationMs, durationMs)
    return {
      mode,
      query,
      results: [],
    }
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean)
  const docs = await getSearchDocuments(repos, services, capabilities, mode)

  const results = docs
    .map((doc) => {
      const scored = scoreDocument(doc, normalizedQuery, terms)
      if (!scored) {
        return null
      }

      return {
        category: doc.category,
        capabilityId: doc.capabilityId,
        filePath: doc.filePath,
        id: doc.id,
        matchSource: scored.matchSource,
        mode,
        repoRelativePath: doc.repoRelativePath,
        score: scored.score,
        serviceId: doc.serviceId,
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

  const durationMs = Date.now() - startedAt
  searchLastDurationMs = durationMs
  searchTotalDurationMs += durationMs
  searchMaxDurationMs = Math.max(searchMaxDurationMs, durationMs)
  searchResultCountTotal += results.length

  return {
    mode,
    query,
    results,
  }
}
