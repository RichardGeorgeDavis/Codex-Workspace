export type PreviewMode = 'direct' | 'external' | 'servbay'

export type RepoType =
  | 'node-app'
  | 'other'
  | 'php'
  | 'static'
  | 'threejs'
  | 'vite'
  | 'wordpress'

export type RepoRuntimeStatus = 'error' | 'idle' | 'running' | 'stopped'

export type RepoInstallStatus = 'error' | 'idle' | 'running' | 'succeeded'

export type RepoRuntime = {
  command: string | null
  lastExitCode: number | null
  lastSignal: string | null
  logTail: string[]
  message: string | null
  pid: number | null
  startedAt: string | null
  status: RepoRuntimeStatus
  stoppedAt: string | null
  updatedAt: string | null
}

export type RepoInstall = {
  command: string | null
  finishedAt: string | null
  lastExitCode: number | null
  lastSignal: string | null
  logTail: string[]
  message: string | null
  startedAt: string | null
  status: RepoInstallStatus
  updatedAt: string | null
}

export type RepoHealth = {
  checkedAt: string | null
  httpStatus: number | null
  state: 'healthy' | 'unreachable' | 'unknown'
  url: string | null
}

export type RepoGitState = {
  branch: string | null
  hasGit: boolean
  remoteUrl: string | null
  state: 'clean' | 'dirty' | 'unavailable'
  summary: string
  visibility: 'local-only' | 'private' | 'public' | 'unknown'
  visibilitySource: 'access' | 'none' | 'probe'
}

export type RepoDependencyState = {
  installPath: string | null
  reason: string
  state: 'missing' | 'not-applicable' | 'ready' | 'unknown'
}

export type RepoSavedMetadata = {
  buildCommand?: string
  devCommand?: string
  externalUrl?: string
  healthcheckUrl?: string
  notes?: string
  pinned?: boolean
  preferredMode?: PreviewMode
  previewUrl?: string
  tags?: string[]
}

export type RepoRecentContext = {
  lastActionAt: string | null
  lastActionKind: 'install' | 'open' | 'runtime' | 'select' | null
  lastOpenedAt: string | null
  lastSelectedAt: string | null
}

export type WorkspaceManifestRecord = {
  buildCommand?: string
  devCommand?: string
  externalUrl?: string
  healthcheckUrl?: string
  installCommand?: string
  name: string
  notes?: string
  packageManager?: string
  preferredMode: PreviewMode
  previewCommand?: string
  previewUrl?: string
  servbayPath?: string
  servbaySubdomain?: string
  slug: string
  tags?: string[]
  type: RepoType
}

export type RepoPreset = {
  id: string
  label: string
  rationale: string
}

export type WorkspaceEntry = {
  childDirectories: number
  kind: 'group' | 'repo'
  name: string
  path: string
}

export type WorkspaceMilestone = {
  description: string
  status: 'next' | 'planned' | 'ready'
  title: string
}

export type WorkspaceRepo = {
  buildCommand: string | null
  collection: string
  detectedBy: 'files' | 'manifest'
  dependencies: RepoDependencyState
  devCommand: string | null
  externalUrl: string | null
  git: RepoGitState
  hasManifest: boolean
  hasSavedMetadata: boolean
  health: RepoHealth
  healthcheckUrl: string | null
  isPinned: boolean
  install: RepoInstall
  installCommand: string | null
  location: 'direct' | 'grouped'
  manifestPath: string | null
  metadataUpdatedAt: string | null
  name: string
  notes: string
  packageManager: string
  path: string
  preferredMode: PreviewMode
  previewCommand: string | null
  previewUrl: string | null
  previewUrlSource: 'external' | 'inferred' | 'manifest' | 'runtime' | 'saved' | 'unknown'
  readmePath: string | null
  recent: RepoRecentContext
  recommendedPreset: RepoPreset
  relativePath: string
  savedMetadata: RepoSavedMetadata | null
  servbayPath: string | null
  servbaySubdomain: string | null
  slug: string
  suggestedManifest: WorkspaceManifestRecord
  tags: string[]
  type: RepoType
  runtime: RepoRuntime
}

export type WorkspaceSummary = {
  dataRoot: string
  generatedAt: string
  milestones: WorkspaceMilestone[]
  repos: WorkspaceRepo[]
  reposRoot: string
  runtimeDefaults: {
    externalWordPressMode: string
    manifestPath: string
    previewMode: PreviewMode
    servbayOptional: boolean
  }
  sharedRoot: string
  stats: {
    cacheBuckets: number
    directPreferredRepos: number
    discoveredRepos: number
    externalPreferredRepos: number
    handoverDocs: number
    manifestBackedRepos: number
    runnableRepos: number
    runningRepos: number
    topLevelEntries: number
  }
  topLevelEntries: WorkspaceEntry[]
  urls: {
    apiBase: string
    health: string
    web: string
  }
  workspaceRoot: string
}
