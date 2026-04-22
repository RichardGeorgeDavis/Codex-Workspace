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

export type RepoIntakeResult = {
  coverCreated: boolean
  coverImagePath: string
  manifestCreated: boolean
  manifestPath: string | null
  notes: string[]
  readmeCreated: boolean
  readmePath: string
  readmeUpdated: boolean
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

export type RepoSideLoadStatus = 'fresh' | 'missing' | 'stale'

export type RepoSideLoadArtifact = {
  path: string
  relativePath: string
  role: 'abstract' | 'entry' | 'overview' | 'sources'
}

export type RepoSideLoad = {
  generatedAt: string | null
  inputCount: number
  outputs: RepoSideLoadArtifact[]
  status: RepoSideLoadStatus
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
  entryDocs?: string[]
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

export type WorkspaceCapabilityClassification =
  | 'ability'
  | 'core-service'
  | 'reference-only'
  | 'repo-level-adoption'

export type WorkspaceCapabilityInstallMethod = 'git' | 'snapshot'

export type WorkspaceCapabilityActionId =
  | 'disable'
  | 'enable'
  | 'install'
  | 'uninstall'
  | 'update'

export type WorkspaceCapability = {
  category: string
  classification: WorkspaceCapabilityClassification
  description: string
  docsPath: string | null
  enabled: boolean
  enabledByDefault: boolean
  exposeInHub: boolean
  id: string
  installMethod: WorkspaceCapabilityInstallMethod
  installPath: string | null
  installTarget: string
  installed: boolean
  name: string
  notes: string
  readmePath: string | null
  repoUsageNotes: string
  sourceUrl: string
  uninstallPolicy: string
  updatedAt: string | null
  updateStrategy: string
}

export type WorkspaceCapabilityManifestIssue = {
  capabilityId: string | null
  capabilityName: string | null
  remediation: string
  reason: string
}

export type WorkspaceCoreServiceManifestIssue = {
  remediation: string
  reason: string
  serviceId: string | null
  serviceName: string | null
}

export type WorkspaceCapabilitiesSnapshot = {
  capabilities: WorkspaceCapability[]
  generatedAt: string
  manifestIssues: WorkspaceCapabilityManifestIssue[]
  stats: {
    abilities: number
    coreServices: number
    disabled: number
    enabled: number
    exposedInHub: number
    installed: number
    installable: number
    notInstalled: number
    rejectedEntries: number
    referenceOnly: number
    total: number
  }
}

export type WorkspaceSearchResult = {
  category: 'artifact' | 'capability' | 'failure-report' | 'repo' | 'service'
  capabilityId: string | null
  filePath: string | null
  id: string
  matchSource: string
  mode: 'deep' | 'thin'
  repoRelativePath: string | null
  score: number
  serviceId: string | null
  snippet: string
  subtitle: string
  title: string
  workspaceRelativePath: string | null
}

export type WorkspaceSearchResponse = {
  mode: 'deep' | 'thin'
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
    | 'capability'
    | 'connected'
    | 'cover'
    | 'failure-report'
    | 'install'
    | 'install-log'
    | 'manifest'
    | 'metadata'
    | 'runtime'
    | 'runtime-log'
    | 'service'
}

export type WorkspaceCoreService = {
  branch: string | null
  cacheRoot: string
  category: 'memory'
  configPath: string
  description: string
  docsPath: string | null
  exportsRoot: string
  homePath: string
  id: string
  identityPath: string
  install: RepoInstall
  installCommand: string
  installCommandArgs: string[]
  lastCommandAt: string | null
  lastCommandKind: string | null
  lastCommandTarget: string | null
  lastCodexExportAt: string | null
  lastCodexExportTarget: string | null
  lastIngestAt: string | null
  lastIngestTarget: string | null
  lastInstallAt: string | null
  lastRuntimeStartAt: string | null
  lastSaveAt: string | null
  lastSaveTarget: string | null
  lastSearchAt: string | null
  lastSearchQuery: string | null
  lastSyncAt: string | null
  lastWakeUpAt: string | null
  name: string
  notes: string
  originUrl: string | null
  readmePath: string | null
  repoPath: string
  repoPresent: boolean
  repoRelativePath: string
  runtime: RepoRuntime
  runtimeCommand: string
  runtimeCommandArgs: string[]
  sharedRoot: string
  statePath: string
  syncCommand: string
  syncCommandArgs: string[]
  upstreamUrl: string | null
  updatedAt: string | null
  user: string
  venvPath: string
  venvReady: boolean
  version: string | null
}

export type WorkspaceCoreServiceTargetKind = 'current-repo' | 'repo' | 'workspace-docs'

export type WorkspaceCoreServiceCommandId =
  | 'build-graph'
  | 'export-codex-current'
  | 'mine-codex-current'
  | 'runtime-start'
  | 'search'
  | 'save-repo'
  | 'save-workspace'
  | 'status'
  | 'sync'
  | 'wake-up'

export type WorkspaceCoreServiceCommand = {
  description: string
  enabled: boolean
  id: WorkspaceCoreServiceCommandId
  label: string
  reasonDisabled: string | null
  shellCommand: string
}

export type WorkspaceCoreServiceGraph = {
  artifacts: {
    htmlPath: string | null
    jsonPath: string | null
    reportPath: string | null
  }
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

export type WorkspaceCoreServiceTargetContext = {
  commands: WorkspaceCoreServiceCommand[]
  graph: WorkspaceCoreServiceGraph
  lastRelevantIngestTarget: string | null
  metadataExists: boolean
  metadataPath: string | null
  recommendedActionId: 'save-repo' | 'save-workspace' | null
  recommendedActionLabel: string | null
  repoRelativePath: string | null
  serviceId: string
  targetAvailable: boolean
  targetKind: WorkspaceCoreServiceTargetKind
  targetLabel: string
  targetPath: string | null
}

export type WorkspaceRepo = {
  agentTooling: RepoAgentTooling
  buildCommand: string | null
  collection: string
  detectedBy: 'files' | 'manifest'
  detailLevel: 'detail' | 'list'
  diagnosticsFreshness: 'fresh' | 'skipped' | 'stale' | 'warming'
  dependencies: RepoDependencyState
  designPath: string | null
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
  sideLoad?: RepoSideLoad | null
  tags: string[]
  type: RepoType
  runtime: RepoRuntime
}

export type WorkspaceSummary = {
  agentEnvironment: WorkspaceAgentEnvironment
  archives: WorkspaceArchive[]
  capabilities: WorkspaceCapability[]
  coreServices: WorkspaceCoreService[]
  coreServiceIssues: WorkspaceCoreServiceManifestIssue[]
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
    abilities: number
    archiveFiles: number
    cacheBuckets: number
    enabledAbilities: number
    installedAbilities: number
    coreServices: number
    directPreferredRepos: number
    discoveredRepos: number
    externalPreferredRepos: number
    handoverDocs: number
    manifestBackedRepos: number
    omxDetectedRepos: number
    opencodeConfiguredRepos: number
    referenceCapabilities: number
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
