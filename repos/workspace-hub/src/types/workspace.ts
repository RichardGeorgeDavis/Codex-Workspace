export type PreviewMode = 'direct' | 'external' | 'servbay'
export type SummaryRequestReason =
  | 'action'
  | 'event'
  | 'hydration'
  | 'initial'
  | 'manual-refresh'
  | 'search'

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

export type FailureKind = 'install' | 'runtime'

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

export type RepoAgentTooling = {
  agentsPath: string | null
  agentStackPath: string | null
  codexProjectConfigPath: string | null
  codexProjectSkillsPath: string | null
  codexSkillsPath: string | null
  omxPath: string | null
  openAgentConfigPath: string | null
  openAgentLegacyConfigPath: string | null
  openCodePath: string | null
  workspaceSkillsPath: string | null
}

export type WorkspaceAgentCommand = {
  available: boolean
  path: string | null
  version: string | null
}

export type WorkspaceAgentEnvironment = {
  agentDoctorPath: string
  agentsTemplatePath: string | null
  bun: WorkspaceAgentCommand
  codex: WorkspaceAgentCommand
  codexTemplatePath: string | null
  initAgentsTreePath: string
  omx: WorkspaceAgentCommand
  opencode: WorkspaceAgentCommand
  opencodeTemplatePath: string | null
  referencePolicy: string
  sharedSkillsCount: number
  sharedSkillsPath: string
  userCodexConfigPath: string | null
  userOpenAgentConfigPath: string | null
  userOpenCodeConfigPath: string | null
}

export type RepoAgentPresetId =
  | 'all-in-one'
  | 'codex-baseline'
  | 'omx-ready'
  | 'opencode'

export type RepoAgentPresetResult = {
  appliedFiles: string[]
  notes: string[]
  preset: RepoAgentPresetId
  skippedFiles: string[]
}

export type RepoRecentContext = {
  lastActionAt: string | null
  lastActionKind: 'install' | 'open' | 'runtime' | 'select' | null
  lastOpenedAt: string | null
  lastSelectedAt: string | null
}

export type RepoFailureReportSummary = {
  command: string | null
  exitCode: number | null
  filePath: string
  generatedAt: string
  kind: FailureKind
  message: string | null
  signal: string | null
  workspaceRelativePath: string
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

export type WorkspaceArchive = {
  name: string
  path: string
  relativePath: string
}

export type WorkspaceSearchResult = {
  category: 'artifact' | 'failure-report' | 'repo'
  filePath: string | null
  id: string
  matchSource: string
  repoRelativePath: string | null
  score: number
  snippet: string
  subtitle: string
  title: string
  workspaceRelativePath: string | null
}

export type WorkspaceSearchResponse = {
  query: string
  results: WorkspaceSearchResult[]
}

export type WorkspaceEvent = {
  generatedAt: string
  message?: string
  relativePath: string | null
  status?: string
  type:
    | 'activity'
    | 'agent'
    | 'connected'
    | 'cover'
    | 'failure-report'
    | 'install'
    | 'install-log'
    | 'manifest'
    | 'metadata'
    | 'runtime'
    | 'runtime-log'
}

export type WorkspaceRepo = {
  agentTooling: RepoAgentTooling
  buildCommand: string | null
  collection: string
  detectedBy: 'files' | 'manifest'
  diagnosticsFreshness: 'fresh' | 'skipped' | 'stale' | 'warming'
  dependencies: RepoDependencyState
  devCommand: string | null
  externalUrl: string | null
  failureReport: RepoFailureReportSummary | null
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
  agentEnvironment: WorkspaceAgentEnvironment
  archives: WorkspaceArchive[]
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
    agentEnabledRepos: number
    archiveFiles: number
    cacheBuckets: number
    directPreferredRepos: number
    discoveredRepos: number
    externalPreferredRepos: number
    handoverDocs: number
    manifestBackedRepos: number
    omxDetectedRepos: number
    opencodeConfiguredRepos: number
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
