import { execFile } from 'node:child_process'
import { type Dirent } from 'node:fs'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type {
  RepoDependencyState,
  RepoGitState,
  RepoInstall,
  RepoRecentContext,
  PreviewMode,
  RepoPreset,
  RepoHealth,
  RepoRuntime,
  RepoType,
  WorkspaceArchive,
  WorkspaceManifestRecord,
  WorkspaceMilestone,
  WorkspaceRepo,
  WorkspaceSummary,
} from '../src/types/workspace.ts'
import { readWorkspaceMetadata, type StoredRepoMetadata } from './workspace-metadata.ts'

type RepoManifest = {
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

type PackageJson = {
  buildCommand?: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  name?: unknown
  packageManager?: unknown
  scripts?: Record<string, string>
}

type RepoRemoteInfo = {
  name: string
  url: string
}

type ParsedRemote = {
  apiUrl: string
  provider: 'bitbucket' | 'github' | 'gitlab'
}

const readmeCandidates = [
  'README.md',
  'README.txt',
  'readme.md',
  'readme.txt',
  'HANDOVER.md',
  'handover.md',
]

const repoTypes: RepoType[] = [
  'node-app',
  'other',
  'php',
  'static',
  'threejs',
  'vite',
  'wordpress',
]

const archiveFileExtensions = [
  '.tar.bz2',
  '.tar.gz',
  '.tar.xz',
  '.tar.zst',
  '.tbz2',
  '.tgz',
  '.txz',
  '.7z',
  '.rar',
  '.tar',
  '.zip',
  '.bz2',
  '.gz',
  '.xz',
  '.zst',
]

const ignoredArchiveDisplayRoots = ['repos/Check-[Sort+add]/']

const previewModes: PreviewMode[] = ['direct', 'external', 'servbay']
const publicManifestFileName = 'project.json'
const localManifestFileName = 'project.local.json'

const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const reposRoot = path.join(workspaceRoot, 'repos')
const sharedRoot = path.join(workspaceRoot, 'shared')
const cacheRoot = path.join(workspaceRoot, 'cache')
const dataRoot = path.join(appRoot, 'data')
const execFileAsync = promisify(execFile)
const staticPreviewPortBase = 4300
const staticPreviewPortRange = 1000
const gitVisibilityCacheTtlMs = 15 * 60 * 1000
const gitVisibilityCache = new Map<
  string,
  {
    expiresAt: number
    result: Pick<RepoGitState, 'remoteUrl' | 'visibility' | 'visibilitySource'>
  }
>()

type VisibleDirectoryData = {
  archiveFiles: WorkspaceArchive[]
  directoryNames: string[]
  names: string[]
}

function isVisible(name: string) {
  return !name.startsWith('.')
}

function isPreviewMode(value: unknown): value is PreviewMode {
  return typeof value === 'string' && previewModes.includes(value as PreviewMode)
}

function isRepoType(value: unknown): value is RepoType {
  return typeof value === 'string' && repoTypes.includes(value as RepoType)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
}

function createManifestRecord(
  manifest: WorkspaceManifestRecord,
): WorkspaceManifestRecord {
  return Object.fromEntries(
    Object.entries(manifest).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0
      }

      return value !== undefined && value !== null && value !== ''
    }),
  ) as WorkspaceManifestRecord
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readVisibleEntries(root: string) {
  const entries = await readdir(root, { withFileTypes: true })

  return entries.filter((entry) => isVisible(entry.name))
}

async function readVisibleDirectories(root: string) {
  const entries = await readVisibleEntries(root)

  return entries.filter((entry) => entry.isDirectory() && isVisible(entry.name))
}

function isArchiveFileName(name: string) {
  const normalizedName = name.trim().toLowerCase()

  return normalizedName.length > 0
    && archiveFileExtensions.some((extension) => normalizedName.endsWith(extension))
}

function buildArchiveRecords(rootPath: string, entries: Dirent[]): WorkspaceArchive[] {
  return entries
    .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && isArchiveFileName(entry.name))
    .map((entry) => {
      const archivePath = path.join(rootPath, entry.name)

      return {
        name: entry.name,
        path: archivePath,
        relativePath: path.relative(workspaceRoot, archivePath),
      }
    })
}

function shouldDisplayArchive(archive: WorkspaceArchive) {
  return !ignoredArchiveDisplayRoots.some((prefix) => archive.relativePath.startsWith(prefix))
}

function buildVisibleDirectoryData(rootPath: string, entries: Dirent[]): VisibleDirectoryData {
  return {
    archiveFiles: buildArchiveRecords(rootPath, entries),
    directoryNames: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    names: entries.map((entry) => entry.name),
  }
}

async function readVisibleDirectoryData(rootPath: string): Promise<VisibleDirectoryData> {
  return buildVisibleDirectoryData(rootPath, await readVisibleEntries(rootPath))
}

async function readJsonIfPresent<T>(targetPath: string): Promise<T | null> {
  if (!(await fileExists(targetPath))) {
    return null
  }

  try {
    return JSON.parse(await readFile(targetPath, 'utf8')) as T
  } catch {
    return null
  }
}

async function readRepoManifest(rootPath: string) {
  const publicManifestPath = path.join(rootPath, '.workspace', publicManifestFileName)
  const localManifestPath = path.join(rootPath, '.workspace', localManifestFileName)
  const hasPublicManifest = await fileExists(publicManifestPath)
  const hasLocalManifest = await fileExists(localManifestPath)
  const publicManifest = await readJsonIfPresent<RepoManifest>(publicManifestPath)
  const localManifest = await readJsonIfPresent<RepoManifest>(localManifestPath)

  return {
    hasManifest: hasPublicManifest || hasLocalManifest,
    manifest:
      publicManifest || localManifest
        ? {
            ...(publicManifest ?? {}),
            ...(localManifest ?? {}),
          }
        : null,
    manifestPath: hasPublicManifest
      ? publicManifestPath
      : hasLocalManifest
        ? localManifestPath
        : null,
  }
}

function deriveSlug(folderName: string, manifestSlug: unknown) {
  if (isNonEmptyString(manifestSlug)) {
    return manifestSlug
  }

  return folderName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatName(folderName: string, manifestName: unknown) {
  if (isNonEmptyString(manifestName)) {
    return manifestName
  }

  return folderName
}

function hasThreeDependencies(packageJson: PackageJson | null) {
  const dependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  }

  return (
    'three' in dependencies ||
    '@react-three/drei' in dependencies ||
    '@react-three/fiber' in dependencies
  )
}

function detectPackageManager(
  names: string[],
  packageJson: PackageJson | null,
  manifest: RepoManifest | null,
) {
  if (isNonEmptyString(manifest?.packageManager)) {
    return manifest.packageManager
  }

  if (names.includes('pnpm-lock.yaml')) {
    return 'pnpm'
  }

  if (names.includes('yarn.lock')) {
    return 'yarn'
  }

  if (names.includes('package-lock.json') || names.includes('npm-shrinkwrap.json')) {
    return 'npm'
  }

  if (names.includes('composer.lock') || names.includes('composer.json')) {
    return 'composer'
  }

  if (isNonEmptyString(packageJson?.packageManager)) {
    return packageJson.packageManager.split('@')[0]
  }

  return ''
}

async function detectRepoType(
  fullPath: string,
  names: string[],
  packageJson: PackageJson | null,
  collection: string | null,
  manifest: RepoManifest | null,
): Promise<RepoType> {
  if (isRepoType(manifest?.type)) {
    return manifest.type
  }

  if (
    collection === 'wordpress' ||
    names.includes('wp-config.php') ||
    names.includes('wp-content') ||
    names.includes('wp-includes')
  ) {
    return 'wordpress'
  }

  if (names.some((name) => name.startsWith('vite.config.'))) {
    return hasThreeDependencies(packageJson) ? 'threejs' : 'vite'
  }

  if (hasThreeDependencies(packageJson)) {
    return 'threejs'
  }

  if (names.includes('package.json')) {
    return 'node-app'
  }

  if (
    names.includes('composer.json') &&
    (names.includes('index.php') ||
      (names.includes('public') && (await fileExists(path.join(fullPath, 'public', 'index.php')))))
  ) {
    return 'php'
  }

  if (names.includes('index.html')) {
    return 'static'
  }

  return 'other'
}

function defaultPreferredMode(type: RepoType): PreviewMode {
  if (type === 'wordpress') {
    return 'external'
  }

  return 'direct'
}

function buildIdleRuntime(command: string | null): RepoRuntime {
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

function buildIdleInstall(command: string | null): RepoInstall {
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

function buildRecentContext(savedMetadata: StoredRepoMetadata | null): RepoRecentContext {
  return {
    lastActionAt: savedMetadata?.lastActionAt ?? null,
    lastActionKind: savedMetadata?.lastActionKind ?? null,
    lastOpenedAt: savedMetadata?.lastOpenedAt ?? null,
    lastSelectedAt: savedMetadata?.lastSelectedAt ?? null,
  }
}

function buildSavedMetadata(savedMetadata: StoredRepoMetadata | null) {
  if (!savedMetadata) {
    return null
  }

  const nextSavedMetadata = {
    buildCommand: savedMetadata.buildCommand,
    devCommand: savedMetadata.devCommand,
    externalUrl: savedMetadata.externalUrl,
    healthcheckUrl: savedMetadata.healthcheckUrl,
    notes: savedMetadata.notes,
    pinned: savedMetadata.pinned,
    preferredMode: savedMetadata.preferredMode,
    previewUrl: savedMetadata.previewUrl,
    tags: savedMetadata.tags,
  }

  const hasSavedOverrides = Object.values(nextSavedMetadata).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    if (typeof value === 'boolean') {
      return value
    }

    return value !== undefined && value !== null && value !== ''
  })

  return hasSavedOverrides ? nextSavedMetadata : null
}

function buildUnknownHealth(url: string | null): RepoHealth {
  return {
    checkedAt: null,
    httpStatus: null,
    state: 'unknown',
    url,
  }
}

function parseGitBranch(branchLine: string) {
  const normalizedLine = branchLine.trim()

  if (!normalizedLine) {
    return null
  }

  if (normalizedLine.startsWith('No commits yet on ')) {
    return normalizedLine.replace('No commits yet on ', '').trim() || null
  }

  if (normalizedLine.startsWith('HEAD ')) {
    return null
  }

  const [branchName] = normalizedLine.split('...')
  const [normalizedBranch] = branchName.split(' ')

  return normalizedBranch?.trim() || null
}

function toParsedRemote(remoteUrl: string): ParsedRemote | null {
  const normalizedUrl = remoteUrl.trim()

  if (!normalizedUrl) {
    return null
  }

  let host = ''
  let pathname = ''

  const sshMatch = normalizedUrl.match(/^git@([^:]+):(.+)$/u)
  if (sshMatch) {
    host = sshMatch[1]?.trim().toLowerCase() ?? ''
    pathname = sshMatch[2]?.trim() ?? ''
  } else {
    try {
      const parsedUrl = new URL(normalizedUrl)
      host = parsedUrl.hostname.trim().toLowerCase()
      pathname = parsedUrl.pathname.replace(/^\/+/u, '')
    } catch {
      return null
    }
  }

  const normalizedPath = pathname.replace(/\.git$/u, '').replace(/\/+$/u, '')
  const segments = normalizedPath.split('/').filter(Boolean)

  if (host === 'github.com' && segments.length >= 2) {
    return {
      apiUrl: `https://api.github.com/repos/${segments[0]}/${segments[1]}`,
      provider: 'github',
    }
  }

  if (host === 'gitlab.com' && segments.length >= 2) {
    return {
      apiUrl: `https://gitlab.com/api/v4/projects/${encodeURIComponent(segments.join('/'))}`,
      provider: 'gitlab',
    }
  }

  if (host === 'bitbucket.org' && segments.length >= 2) {
    return {
      apiUrl: `https://api.bitbucket.org/2.0/repositories/${segments[0]}/${segments[1]}`,
      provider: 'bitbucket',
    }
  }

  return null
}

async function readGitRemoteInfo(fullPath: string): Promise<RepoRemoteInfo | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', fullPath, 'remote'], {
      maxBuffer: 1024 * 64,
      timeout: 1200,
    })
    const names = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)

    if (!names.length) {
      return null
    }

    const preferredName = names.includes('origin') ? 'origin' : names[0]
    const remoteUrl = (
      await execFileAsync('git', ['-C', fullPath, 'remote', 'get-url', preferredName], {
        maxBuffer: 1024 * 64,
        timeout: 1200,
      })
    ).stdout.trim()

    if (!remoteUrl) {
      return null
    }

    return {
      name: preferredName,
      url: remoteUrl,
    }
  } catch {
    return null
  }
}

async function probePublicRepoVisibility(apiUrl: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 1200)

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'workspace-hub',
      },
      signal: controller.signal,
    })

    if (response.ok) {
      return 'public'
    }

    if ([401, 403, 404].includes(response.status)) {
      return 'not-public'
    }

    return 'unknown'
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timeout)
  }
}

async function canAccessRemote(fullPath: string, remoteName: string) {
  try {
    await execFileAsync('git', ['-C', fullPath, 'ls-remote', '--exit-code', remoteName, 'HEAD'], {
      maxBuffer: 1024 * 64,
      timeout: 1500,
    })
    return true
  } catch {
    return false
  }
}

async function resolveGitVisibility(
  fullPath: string,
  remoteInfo: RepoRemoteInfo | null,
): Promise<Pick<RepoGitState, 'remoteUrl' | 'visibility' | 'visibilitySource'>> {
  if (!remoteInfo?.url) {
    return {
      remoteUrl: null,
      visibility: 'local-only',
      visibilitySource: 'none',
    }
  }

  const cached = gitVisibilityCache.get(remoteInfo.url)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const parsedRemote = toParsedRemote(remoteInfo.url)
  let result: Pick<RepoGitState, 'remoteUrl' | 'visibility' | 'visibilitySource'>

  if (!parsedRemote) {
    result = {
      remoteUrl: remoteInfo.url,
      visibility: 'unknown',
      visibilitySource: 'none',
    }
  } else {
    const publicProbe = await probePublicRepoVisibility(parsedRemote.apiUrl)

    if (publicProbe === 'public') {
      result = {
        remoteUrl: remoteInfo.url,
        visibility: 'public',
        visibilitySource: 'probe',
      }
    } else if (publicProbe === 'not-public' && (await canAccessRemote(fullPath, remoteInfo.name))) {
      result = {
        remoteUrl: remoteInfo.url,
        visibility: 'private',
        visibilitySource: 'access',
      }
    } else {
      result = {
        remoteUrl: remoteInfo.url,
        visibility: 'unknown',
        visibilitySource: 'probe',
      }
    }
  }

  gitVisibilityCache.set(remoteInfo.url, {
    expiresAt: Date.now() + gitVisibilityCacheTtlMs,
    result,
  })

  return result
}

async function readGitState(fullPath: string): Promise<RepoGitState> {
  if (!(await fileExists(path.join(fullPath, '.git')))) {
    return {
      branch: null,
      hasGit: false,
      remoteUrl: null,
      state: 'unavailable',
      summary: 'No Git metadata detected.',
      visibility: 'unknown',
      visibilitySource: 'none',
    }
  }

  try {
    const [{ stdout }, remoteInfo] = await Promise.all([
      execFileAsync(
        'git',
        ['-C', fullPath, 'status', '--short', '--branch'],
        {
          maxBuffer: 1024 * 1024,
          timeout: 1500,
        },
      ),
      readGitRemoteInfo(fullPath),
    ])
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trimEnd())
      .filter(Boolean)
    const branchLine = lines[0]?.startsWith('## ') ? lines[0].slice(3).trim() : ''
    const branch = parseGitBranch(branchLine)
    const isDirty = lines.length > 1
    const baseSummary = branchLine || (branch ? `Branch ${branch}` : 'Git status available')
    const visibility = await resolveGitVisibility(fullPath, remoteInfo)

    return {
      branch,
      hasGit: true,
      remoteUrl: visibility.remoteUrl,
      state: isDirty ? 'dirty' : 'clean',
      summary: `${baseSummary} (${isDirty ? 'dirty' : 'clean'})`,
      visibility: visibility.visibility,
      visibilitySource: visibility.visibilitySource,
    }
  } catch (caughtError) {
    return {
      branch: null,
      hasGit: true,
      remoteUrl: null,
      state: 'unavailable',
      summary:
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : 'Git status is unavailable.',
      visibility: 'unknown',
      visibilitySource: 'none',
    }
  }
}

async function readDependencyState(options: {
  buildCommand: string | null
  devCommand: string | null
  fullPath: string
  installCommand: string | null
  names: string[]
  packageManager: string
  previewCommand: string | null
}): Promise<RepoDependencyState> {
  const normalizedPackageManager = options.packageManager.split('@')[0] ?? ''
  const hasPackageJson = options.names.includes('package.json')
  const hasComposerJson = options.names.includes('composer.json')
  const isNodeStyleRepo =
    hasPackageJson ||
    normalizedPackageManager === 'npm' ||
    normalizedPackageManager === 'pnpm' ||
    normalizedPackageManager === 'yarn'
  const isComposerRepo = hasComposerJson || normalizedPackageManager === 'composer'

  if (isNodeStyleRepo) {
    const installPath = path.join(options.fullPath, 'node_modules')

    if (await fileExists(installPath)) {
      return {
        installPath,
        reason: 'node_modules/ is present.',
        state: 'ready',
      } satisfies RepoDependencyState
    }

    if (
      options.installCommand ||
      options.devCommand ||
      options.buildCommand ||
      options.previewCommand
    ) {
      return {
        installPath,
        reason: 'Node dependencies look required, but node_modules/ is missing.',
        state: 'missing',
      } satisfies RepoDependencyState
    }

    return {
      installPath,
      reason: 'package.json exists, but no install or runtime command was inferred yet.',
      state: 'unknown',
    } satisfies RepoDependencyState
  }

  if (isComposerRepo) {
    const installPath = path.join(options.fullPath, 'vendor')

    if (await fileExists(installPath)) {
      return {
        installPath,
        reason: 'vendor/ is present.',
        state: 'ready',
      } satisfies RepoDependencyState
    }

    if (options.installCommand || hasComposerJson) {
      return {
        installPath,
        reason: 'Composer dependencies look required, but vendor/ is missing.',
        state: 'missing',
      } satisfies RepoDependencyState
    }

    return {
      installPath,
      reason: 'Composer usage is inferred, but dependency readiness is still uncertain.',
      state: 'unknown',
    } satisfies RepoDependencyState
  }

  if (options.installCommand) {
    return {
      installPath: null,
      reason: 'An install command is configured, but this stack does not have a readiness check yet.',
      state: 'unknown',
    } satisfies RepoDependencyState
  }

  return {
    installPath: null,
    reason: 'No package or composer dependency directory is expected for this repo.',
    state: 'not-applicable',
  } satisfies RepoDependencyState
}

function extractPreviewUrlFromLogs(logTail: string[]) {
  for (const line of [...logTail].reverse()) {
    const match = line.match(/https?:\/\/[^\s)]+/i)
    if (match) {
      return match[0].replace(/[.,;]+$/, '')
    }
  }

  return null
}

function resolvePreviewUrl(
  savedPreviewUrl: string | null,
  manifestPreviewUrl: string | null,
  externalUrl: string | null,
  runtime: RepoRuntime,
  fallbackPreviewUrl: string | null,
) {
  if (savedPreviewUrl) {
    return {
      previewUrl: savedPreviewUrl,
      source: 'saved' as const,
    }
  }

  if (manifestPreviewUrl) {
    return {
      previewUrl: manifestPreviewUrl,
      source: 'manifest' as const,
    }
  }

  const runtimePreviewUrl = extractPreviewUrlFromLogs(runtime.logTail)
  if (runtimePreviewUrl) {
    return {
      previewUrl: runtimePreviewUrl,
      source: 'runtime' as const,
    }
  }

  if (externalUrl) {
    return {
      previewUrl: externalUrl,
      source: 'external' as const,
    }
  }

  if (fallbackPreviewUrl) {
    return {
      previewUrl: fallbackPreviewUrl,
      source: 'inferred' as const,
    }
  }

  return {
    previewUrl: null,
    source: 'unknown' as const,
  }
}

function isLocalHealthCandidate(target: string | null) {
  if (!target) {
    return false
  }

  try {
    const url = new URL(target)
    const hostname = url.hostname.toLowerCase()

    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname.endsWith('.demo') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test')
    )
  } catch {
    return false
  }
}

async function probeHealth(url: string | null): Promise<RepoHealth> {
  if (!isLocalHealthCandidate(url)) {
    return buildUnknownHealth(url)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 900)

  try {
    const response = await fetch(url as string, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })

    return {
      checkedAt: new Date().toISOString(),
      httpStatus: response.status,
      state: response.ok ? 'healthy' : 'unreachable',
      url,
    }
  } catch {
    return {
      checkedAt: new Date().toISOString(),
      httpStatus: null,
      state: 'unreachable',
      url,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function deriveScriptCommand(
  manifestCommand: unknown,
  scriptName: 'build' | 'dev' | 'preview',
  packageManager: string,
  packageJson: PackageJson | null,
) {
  if (isNonEmptyString(manifestCommand)) {
    return manifestCommand
  }

  if (!packageJson?.scripts || !isNonEmptyString(packageJson.scripts[scriptName])) {
    return null
  }

  if (packageManager === 'npm') {
    return `npm run ${scriptName}`
  }

  if (packageManager === 'pnpm' || packageManager === 'yarn') {
    return `${packageManager} ${scriptName}`
  }

  return null
}

function hashWorkspacePath(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % staticPreviewPortRange
  }

  return hash
}

function deriveStaticPreviewPort(relativePath: string) {
  return staticPreviewPortBase + hashWorkspacePath(relativePath)
}

function buildStaticServeCommand(port: number) {
  const previewUrl = `http://127.0.0.1:${port}`

  return `echo "Workspace Hub static preview: ${previewUrl}" && if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server ${port} --bind 127.0.0.1; elif command -v php >/dev/null 2>&1; then exec php -S 127.0.0.1:${port}; elif command -v ruby >/dev/null 2>&1; then exec ruby -run -e httpd . -p ${port} -b 127.0.0.1; else echo "No local static file server runtime found (python3, php, ruby)." >&2; exit 1; fi`
}

function deriveDevCommand(
  manifestCommand: unknown,
  packageManager: string,
  packageJson: PackageJson | null,
  type: RepoType,
  relativePath: string,
) {
  const scriptCommand = deriveScriptCommand(
    manifestCommand,
    'dev',
    packageManager,
    packageJson,
  )

  if (scriptCommand) {
    return scriptCommand
  }

  if (type === 'static') {
    return buildStaticServeCommand(deriveStaticPreviewPort(relativePath))
  }

  return null
}

function derivePreviewUrlFallback(
  type: RepoType,
  preferredMode: PreviewMode,
  relativePath: string,
) {
  if (type === 'static' && preferredMode === 'direct') {
    return `http://127.0.0.1:${deriveStaticPreviewPort(relativePath)}`
  }

  return null
}

function deriveInstallCommand(manifestCommand: unknown, packageManager: string) {
  if (isNonEmptyString(manifestCommand)) {
    return manifestCommand
  }

  if (packageManager === 'npm') {
    return 'npm install'
  }

  if (packageManager === 'pnpm' || packageManager === 'yarn') {
    return `${packageManager} install`
  }

  if (packageManager === 'composer') {
    return 'composer install'
  }

  return null
}

function buildRecommendedPreset(type: RepoType, packageManager: string): RepoPreset {
  if (type === 'wordpress') {
    return {
      id: 'wordpress-external',
      label: 'WordPress external',
      rationale: 'WordPress repos usually stay external and are often managed by Local or another mapped runtime.',
    }
  }

  if (type === 'threejs') {
    return {
      id: 'threejs-direct',
      label: 'Three.js direct',
      rationale: 'Three.js and WebGL repos usually behave best on their own local dev server.',
    }
  }

  if (type === 'vite') {
    return {
      id: 'vite-direct',
      label: 'Vite direct',
      rationale: 'Vite repos usually want a direct local port instead of a proxy-first flow.',
    }
  }

  if (type === 'static') {
    return {
      id: 'static-direct',
      label: 'Static direct',
      rationale: 'Static repos can stay lightweight, with direct preview metadata only where it helps.',
    }
  }

  if (type === 'php') {
    return {
      id: 'php-explicit',
      label: 'PHP explicit runtime',
      rationale: 'PHP repos often need repo-specific local hosting details, so manifests should stay explicit.',
    }
  }

  if (type === 'node-app') {
    return {
      id: `node-${packageManager || 'manual'}-direct`,
      label: 'Node direct',
      rationale: 'Node repos with a dev script usually run best as direct local processes on their own port.',
    }
  }

  return {
    id: 'conservative-manual',
    label: 'Conservative manual',
    rationale: 'This repo is classified conservatively, so the manifest should make runtime behaviour explicit.',
  }
}

function buildSuggestedManifest(options: {
  buildCommand: string | null
  devCommand: string | null
  externalUrl: string | null
  healthcheckUrl: string | null
  installCommand: string | null
  name: string
  notes: string
  packageManager: string
  preferredMode: PreviewMode
  previewCommand: string | null
  previewUrl: string | null
  servbayPath: string | null
  servbaySubdomain: string | null
  slug: string
  tags: string[]
  type: RepoType
}) {
  return createManifestRecord({
    buildCommand: options.buildCommand ?? undefined,
    devCommand: options.devCommand ?? undefined,
    externalUrl: options.externalUrl ?? undefined,
    healthcheckUrl: options.healthcheckUrl ?? undefined,
    installCommand: options.installCommand ?? undefined,
    name: options.name,
    notes: options.notes || undefined,
    packageManager: options.packageManager || undefined,
    preferredMode: options.preferredMode,
    previewCommand: options.previewCommand ?? undefined,
    previewUrl: options.previewUrl ?? undefined,
    servbayPath: options.servbayPath ?? undefined,
    servbaySubdomain: options.servbaySubdomain ?? undefined,
    slug: options.slug,
    tags: options.tags.length ? options.tags : undefined,
    type: options.type,
  })
}

function detectReadmePath(fullPath: string, names: string[]) {
  const fileName = readmeCandidates.find((candidate) => names.includes(candidate))

  return fileName ? path.join(fullPath, fileName) : null
}

function isRepoCandidate(names: string[], collection: string | null) {
  if (names.includes('package.json') || names.includes('composer.json')) {
    return true
  }

  if (
    names.includes('index.html') ||
    names.includes('wp-config.php') ||
    names.includes('wp-content')
  ) {
    return true
  }

  if (names.some((name) => name.startsWith('vite.config.'))) {
    return true
  }

  if (collection === 'wordpress') {
    return (
      names.includes('readme.txt') ||
      names.includes('README.md') ||
      names.some((name) => name.endsWith('.php'))
    )
  }

  return false
}

async function buildRepoRecord(
  fullPath: string,
  names: string[],
  collection: string | null,
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
  savedMetadata: StoredRepoMetadata | null,
): Promise<WorkspaceRepo | null> {
  const { hasManifest, manifest, manifestPath } = await readRepoManifest(fullPath)
  const packageJson = await readJsonIfPresent<PackageJson>(path.join(fullPath, 'package.json'))

  if (!hasManifest && !isRepoCandidate(names, collection)) {
    return null
  }

  const folderName = path.basename(fullPath)
  const type = await detectRepoType(fullPath, names, packageJson, collection, manifest)
  const packageManager = detectPackageManager(names, packageJson, manifest)
  const relativePath = path.relative(workspaceRoot, fullPath)
  const recent = buildRecentContext(savedMetadata)
  const savedOverrides = buildSavedMetadata(savedMetadata)
  const manifestPreferredMode = isPreviewMode(manifest?.preferredMode)
    ? manifest.preferredMode
    : defaultPreferredMode(type)
  const preferredMode = savedOverrides?.preferredMode ?? manifestPreferredMode
  const manifestDevCommand = deriveDevCommand(
    manifest?.devCommand,
    packageManager,
    packageJson,
    type,
    relativePath,
  )
  const effectiveDevCommand = savedOverrides?.devCommand ?? manifestDevCommand
  const manifestBuildCommand = deriveScriptCommand(
    manifest?.buildCommand,
    'build',
    packageManager,
    packageJson,
  )
  const effectiveBuildCommand = savedOverrides?.buildCommand ?? manifestBuildCommand
  const previewCommand = deriveScriptCommand(
    manifest?.previewCommand,
    'preview',
    packageManager,
    packageJson,
  )
  const installCommand = deriveInstallCommand(manifest?.installCommand, packageManager)
  const install = installSnapshots.get(fullPath) ?? buildIdleInstall(installCommand)
  const runtime = runtimeSnapshots.get(fullPath) ?? buildIdleRuntime(effectiveDevCommand)
  const manifestExternalUrl = isNonEmptyString(manifest?.externalUrl)
    ? manifest.externalUrl
    : null
  const externalUrl = savedOverrides?.externalUrl ?? manifestExternalUrl
  const manifestPreviewUrl = isNonEmptyString(manifest?.previewUrl)
    ? manifest.previewUrl
    : null
  const fallbackPreviewUrl = derivePreviewUrlFallback(type, preferredMode, relativePath)
  const resolvedPreview = resolvePreviewUrl(
    savedOverrides?.previewUrl ?? null,
    manifestPreviewUrl,
    externalUrl,
    runtime,
    fallbackPreviewUrl,
  )
  const manifestHealthcheckUrl = isNonEmptyString(manifest?.healthcheckUrl)
    ? manifest.healthcheckUrl
    : null
  const healthcheckUrl = savedOverrides?.healthcheckUrl ?? manifestHealthcheckUrl
  const name = formatName(folderName, manifest?.name)
  const slug = deriveSlug(folderName, manifest?.slug)
  const manifestNotes = isNonEmptyString(manifest?.notes) ? manifest.notes : ''
  const manifestTags = normalizeTags(manifest?.tags)
  const recommendedPreset = buildRecommendedPreset(type, packageManager)
  const servbayPath = isNonEmptyString(manifest?.servbayPath) ? manifest.servbayPath : null
  const servbaySubdomain = isNonEmptyString(manifest?.servbaySubdomain)
    ? manifest.servbaySubdomain
    : null
  const suggestedManifest = buildSuggestedManifest({
    buildCommand: manifestBuildCommand,
    devCommand: manifestDevCommand,
    externalUrl: manifestExternalUrl,
    healthcheckUrl: manifestHealthcheckUrl,
    installCommand,
    name,
    notes: manifestNotes,
    packageManager,
    preferredMode: manifestPreferredMode,
    previewCommand,
    previewUrl: manifestPreviewUrl ?? fallbackPreviewUrl,
    servbayPath,
    servbaySubdomain,
    slug,
    tags: manifestTags,
    type,
  })
  const [health, git, dependencies] = await Promise.all([
    probeHealth(healthcheckUrl ?? resolvedPreview.previewUrl),
    readGitState(fullPath),
    readDependencyState({
      buildCommand: effectiveBuildCommand,
      devCommand: effectiveDevCommand,
      fullPath,
      installCommand,
      names,
      packageManager,
      previewCommand,
    }),
  ])

  return {
    buildCommand: effectiveBuildCommand,
    collection: collection ?? 'direct',
    detectedBy: hasManifest ? 'manifest' : 'files',
    dependencies,
    devCommand: effectiveDevCommand,
    externalUrl,
    git,
    hasManifest,
    hasSavedMetadata: Boolean(savedOverrides),
    health,
    healthcheckUrl,
    isPinned: savedOverrides?.pinned ?? false,
    install,
    installCommand,
    location: collection ? 'grouped' : 'direct',
    manifestPath: hasManifest ? manifestPath : null,
    metadataUpdatedAt: savedMetadata?.updatedAt ?? null,
    name,
    notes: savedOverrides?.notes ?? manifestNotes,
    packageManager,
    path: fullPath,
    preferredMode,
    previewCommand,
    previewUrl: resolvedPreview.previewUrl,
    previewUrlSource: resolvedPreview.source,
    readmePath: detectReadmePath(fullPath, names),
    recent,
    recommendedPreset,
    relativePath,
    savedMetadata: savedOverrides,
    servbayPath,
    servbaySubdomain,
    slug,
    suggestedManifest,
    tags: savedOverrides?.tags ?? manifestTags,
    type,
    runtime,
  }
}

async function discoverWorkspace(
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const reposDirectoryData = await readVisibleDirectoryData(reposRoot)
  const savedMetadataState = await readWorkspaceMetadata()
  const directoryResults = await Promise.all(
    reposDirectoryData.directoryNames.map(async (directoryName) => {
      const fullPath = path.join(reposRoot, directoryName)
      const directoryData = await readVisibleDirectoryData(fullPath)
      const directRepo = await buildRepoRecord(
        fullPath,
        directoryData.names,
        null,
        installSnapshots,
        runtimeSnapshots,
        savedMetadataState.repos[path.relative(workspaceRoot, fullPath)] ?? null,
      )

      if (directRepo) {
        return {
          archives: directoryData.archiveFiles,
          repos: [directRepo],
          topLevelEntry: {
            childDirectories: directoryData.directoryNames.length,
            kind: 'repo' as const,
            name: directoryName,
            path: fullPath,
          },
        }
      }

      const childResults = await Promise.all(
        directoryData.directoryNames.map(async (childDirectoryName) => {
          const childPath = path.join(fullPath, childDirectoryName)
          const childDirectoryData = await readVisibleDirectoryData(childPath)

          return {
            archiveFiles: childDirectoryData.archiveFiles,
            repo: await buildRepoRecord(
              childPath,
              childDirectoryData.names,
              directoryName,
              installSnapshots,
              runtimeSnapshots,
              savedMetadataState.repos[path.relative(workspaceRoot, childPath)] ?? null,
            ),
          }
        }),
      )

      const childRepos = childResults
        .map((result) => result.repo)
        .filter((repo): repo is WorkspaceRepo => Boolean(repo))

      return {
        archives: [
          ...directoryData.archiveFiles,
          ...childResults.flatMap((result) => result.archiveFiles),
        ],
        repos: childRepos,
        topLevelEntry: {
          childDirectories: directoryData.directoryNames.length,
          kind: 'group' as const,
          name: directoryName,
          path: fullPath,
        },
      }
    }),
  )

  const archives = [
    ...reposDirectoryData.archiveFiles,
    ...directoryResults.flatMap((result) => result.archives),
  ].filter(shouldDisplayArchive)

  archives.sort((left, right) => left.relativePath.localeCompare(right.relativePath))

  const repos = directoryResults.flatMap((result) => result.repos)
  const topLevelEntries = directoryResults.map((result) => result.topLevelEntry)

  repos.sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1
    }

    if (left.collection === right.collection) {
      return left.name.localeCompare(right.name)
    }

    return left.collection.localeCompare(right.collection)
  })

  return { archives, repos, topLevelEntries }
}

async function countSharedMarkdownFiles() {
  const entries = await readdir(sharedRoot, { withFileTypes: true })

  return entries.filter((entry) => isVisible(entry.name) && entry.name.endsWith('.md')).length
}

async function countCacheBuckets() {
  return (await readVisibleDirectories(cacheRoot)).length
}

function buildMilestones(): WorkspaceMilestone[] {
  return [
    {
      description: 'Sibling repos are scanned and listed in the UI.',
      status: 'ready',
      title: 'Repo discovery',
    },
    {
      description: 'Repo types and preview modes are inferred conservatively.',
      status: 'ready',
      title: 'Repo classification',
    },
    {
      description: 'Open, preview, terminal, and runtime controls are available from the details panel.',
      status: 'ready',
      title: 'Repo actions',
    },
    {
      description: 'Per-repo notes, tags, preferred mode, and command or URL overrides persist locally under data/.',
      status: 'ready',
      title: 'Saved overrides',
    },
    {
      description: 'Recommended presets and manifest authoring reduce how much repo metadata needs to be typed by hand.',
      status: 'ready',
      title: 'Repo presets',
    },
    {
      description: 'Git branch or dirty state and dependency-readiness warnings are now visible in the repo list and details panel.',
      status: 'ready',
      title: 'Repo diagnostics',
    },
    {
      description: 'Troubleshooting guidance and install-focused helpers now support repos that report missing or uncertain dependencies.',
      status: 'ready',
      title: 'Troubleshooting',
    },
    {
      description: 'Pinned repos now sort to the top, and quick-copy helpers reduce repeated manual copying from the details panel.',
      status: 'ready',
      title: 'Pinned workflows',
    },
    {
      description: 'Last-opened and recent-activity tracking now help the hub restore a more useful working set.',
      status: 'ready',
      title: 'Recent context',
    },
    {
      description: 'Next: broaden install detection beyond Node and Composer so dependency guidance is more accurate across mixed stacks.',
      status: 'next',
      title: 'Richer dependency detection',
    },
  ]
}

export async function findWorkspaceRepo(
  relativePath: string,
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
) {
  const normalizedRelativePath = relativePath.replace(/^\/+/, '')
  const { repos } = await discoverWorkspace(installSnapshots, runtimeSnapshots)

  return repos.find((repo) => repo.relativePath === normalizedRelativePath) ?? null
}

export async function buildWorkspaceSummary(
  apiPort: number,
  installSnapshots: Map<string, RepoInstall>,
  runtimeSnapshots: Map<string, RepoRuntime>,
): Promise<WorkspaceSummary> {
  const { archives, repos, topLevelEntries } = await discoverWorkspace(
    installSnapshots,
    runtimeSnapshots,
  )

  return {
    archives,
    dataRoot,
    generatedAt: new Date().toISOString(),
    milestones: buildMilestones(),
    repos,
    reposRoot,
    runtimeDefaults: {
      externalWordPressMode: 'external',
      manifestPath: '.workspace/project.json',
      previewMode: 'direct',
      servbayOptional: true,
    },
    sharedRoot,
    stats: {
      archiveFiles: archives.length,
      cacheBuckets: await countCacheBuckets(),
      directPreferredRepos: repos.filter((repo) => repo.preferredMode === 'direct').length,
      discoveredRepos: repos.length,
      externalPreferredRepos: repos.filter((repo) => repo.preferredMode === 'external').length,
      handoverDocs: await countSharedMarkdownFiles(),
      manifestBackedRepos: repos.filter((repo) => repo.hasManifest).length,
      runnableRepos: repos.filter((repo) => repo.devCommand).length,
      runningRepos: repos.filter((repo) => repo.runtime.status === 'running').length,
      topLevelEntries: topLevelEntries.length,
    },
    topLevelEntries,
    urls: {
      apiBase: `http://127.0.0.1:${apiPort}`,
      health: `http://127.0.0.1:${apiPort}/api/health`,
      web: 'http://127.0.0.1:4100',
    },
    workspaceRoot,
  }
}
