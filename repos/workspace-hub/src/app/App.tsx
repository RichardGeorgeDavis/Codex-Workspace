import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'

import { RepoDetails } from '../features/repos/RepoDetails.tsx'
import { SectionCard } from '../components/SectionCard.tsx'
import { WorkspaceCapabilitiesPanel } from '../features/capabilities/WorkspaceCapabilitiesPanel.tsx'
import {
  loadStoredRepoLayoutMode,
  persistRepoLayoutMode,
  resolveSelectedRepoPath,
} from '../features/layout/repoLayout.ts'
import { RepoSnapshot } from '../features/repos/RepoSnapshot.tsx'
import { CoreServicesPanel } from '../features/services/CoreServicesPanel.tsx'
import { CoreServiceDetails } from '../features/services/CoreServiceDetails.tsx'
import { MempalaceWorkspacePage } from '../features/services/MempalaceWorkspacePage.tsx'
import { SettingsPanel } from '../features/settings/SettingsPanel.tsx'
import { StatusStrip } from '../features/status/StatusStrip.tsx'
import { ThemeControls } from '../features/theme/ThemeControls.tsx'
import {
  applyThemePreference,
  persistThemePreference,
  type ThemeMode,
  type ThemePreference,
  type ThemePreset,
} from '../features/theme/theme.ts'
import {
  applyRepoAgentPreset,
  fetchWorkspaceCapabilitiesSnapshot,
  fetchCoreServiceTargetContext,
  fetchWorkspaceRepoDetails,
  fetchWorkspaceSummary,
  fetchWorkspaceSummaryBase,
  generateRepoCover,
  openCoreServiceTarget,
  openRepoTarget,
  openWorkspaceCapabilityTarget,
  openWorkspacePath,
  recordRepoActivity,
  resetRepoMetadata,
  runCoreServiceInstall,
  runCoreServiceCommand,
  runCoreServiceRuntimeAction,
  runRepoInstall,
  runRepoIntake,
  runRepoRuntimeAction,
  runWorkspaceCapabilityAction,
  saveRepoMetadata,
  searchWorkspace,
  stopAllRuntimes,
  subscribeWorkspaceEvents,
  syncCoreService,
  writeRepoManifest,
} from '../lib/api.ts'
import {
  mergeWorkspaceRepoDetails,
  mergeWorkspaceSummaryDiagnostics,
} from '../lib/mergeWorkspaceSummary.ts'
import type {
  RepoIntakeResult,
  RepoAgentPresetId,
  RepoType,
  SummaryRequestReason,
  WorkspaceEvent,
  WorkspaceArchive,
  WorkspaceCapabilitiesSnapshot,
  WorkspaceCoreServiceCommandId,
  WorkspaceCoreServiceTargetContext,
  WorkspaceCoreServiceTargetKind,
  WorkspaceRepo,
  WorkspaceSearchResult,
  WorkspaceSummary,
} from '../types/workspace.ts'

import './app.css'

type RepoFilterValue =
  | RepoType
  | 'all'
  | 'external'
  | 'pinned'
  | 'recent'
  | 'runnable'
type AppProps = {
  initialThemePreference: ThemePreference
}

type WorkspaceView = 'dashboard' | 'mempalace'

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatLiveEvent(event: WorkspaceEvent) {
  const eventLabel = event.type.replace(/-/g, ' ')

  if (event.relativePath) {
    return `${eventLabel} • ${event.relativePath}`
  }

  return event.message ? `${eventLabel} • ${event.message}` : eventLabel
}

function parseTimestamp(value: string | null) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getRepoRecentScore(repo: WorkspaceRepo) {
  return Math.max(
    parseTimestamp(repo.recent.lastActionAt),
    parseTimestamp(repo.recent.lastOpenedAt),
    parseTimestamp(repo.recent.lastSelectedAt),
  )
}

function pickDefaultRepo(repos: WorkspaceRepo[]) {
  return [...repos].sort((left, right) => {
    const recentDifference = getRepoRecentScore(right) - getRepoRecentScore(left)
    if (recentDifference !== 0) {
      return recentDifference
    }

    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })[0] ?? null
}

function filterRepos(
  repos: WorkspaceRepo[],
  normalizedSearch: string,
  selectedFilter: RepoFilterValue,
) {
  return repos.filter((repo) => {
    if (selectedFilter === 'external') {
      if (repo.preferredMode !== 'external') {
        return false
      }
    } else if (selectedFilter === 'pinned') {
      if (!repo.isPinned) {
        return false
      }
    } else if (selectedFilter === 'recent') {
      if (!getRepoRecentScore(repo)) {
        return false
      }
    } else if (selectedFilter === 'runnable') {
      if (!repo.devCommand) {
        return false
      }
    } else if (selectedFilter !== 'all' && repo.type !== selectedFilter) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const haystack = [
      repo.collection,
      repo.dependencies.reason,
      repo.dependencies.state,
      repo.git.branch ?? '',
      repo.git.visibility,
      repo.git.summary,
      repo.install.message ?? '',
      repo.install.status,
      repo.isPinned ? 'pinned' : '',
      repo.preferredMode,
      repo.recent.lastActionKind ?? '',
      repo.name,
      repo.packageManager,
      repo.relativePath,
      repo.slug,
      repo.tags.join(' '),
      repo.type,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}

function sortReposForDisplay(repos: WorkspaceRepo[]) {
  return [...repos].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1
    }

    const recentDifference = getRepoRecentScore(right) - getRepoRecentScore(left)
    if (recentDifference !== 0) {
      return recentDifference
    }

    if (left.collection === right.collection) {
      return left.name.localeCompare(right.name)
    }

    return left.collection.localeCompare(right.collection)
  })
}

function filterArchives(
  archives: WorkspaceArchive[],
  normalizedSearch: string,
) {
  return archives.filter((archive) => {
    if (!normalizedSearch) {
      return true
    }

    const haystack = [archive.name, archive.relativePath].join(' ').toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}

export function App({ initialThemePreference }: AppProps) {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null)
  const [capabilitySnapshot, setCapabilitySnapshot] = useState<WorkspaceCapabilitiesSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPendingKey, setActionPendingKey] = useState<string | null>(null)
  const [indexedSearchError, setIndexedSearchError] = useState<string | null>(null)
  const [indexedSearchLoading, setIndexedSearchLoading] = useState(false)
  const [indexedSearchResults, setIndexedSearchResults] = useState<WorkspaceSearchResult[]>([])
  const [indexedSearchMode, setIndexedSearchMode] = useState<WorkspaceSearchResult['mode']>('thin')
  const [intakeResultsByPath, setIntakeResultsByPath] = useState<Record<string, RepoIntakeResult>>(
    {},
  )
  const [liveEventLabel, setLiveEventLabel] = useState('Waiting for live updates')
  const [liveStatus, setLiveStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    'connecting',
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null)
  const [repoLayoutMode, setRepoLayoutMode] = useState(() => loadStoredRepoLayoutMode())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<RepoFilterValue>('all')
  const [showArchived, setShowArchived] = useState(true)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('dashboard')
  const [mempalaceTargetKind, setMempalaceTargetKind] =
    useState<WorkspaceCoreServiceTargetKind>('workspace-docs')
  const [mempalaceTargetRepoRelativePath, setMempalaceTargetRepoRelativePath] = useState<string | null>(null)
  const [mempalaceTargetContext, setMempalaceTargetContext] =
    useState<WorkspaceCoreServiceTargetContext | null>(null)
  const [mempalaceCommandOutput, setMempalaceCommandOutput] = useState<string | null>(null)
  const [themePreference, setThemePreference] = useState(initialThemePreference)
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const lastRecordedSelectionRef = useRef<string | null>(null)
  const liveRefreshTimeoutRef = useRef<number | null>(null)
  const repoDetailsInFlightRef = useRef<string | null>(null)
  const repoDetailsHydrationCountRef = useRef(0)
  const summaryRef = useRef<WorkspaceSummary | null>(null)
  const softRefreshInFlightRef = useRef<Promise<void> | null>(null)
  const softRefreshQueuedRef = useRef(false)
  const softRefreshCoalescedCountRef = useRef(0)
  const triggerSoftRefresh = useEffectEvent((reason: SummaryRequestReason = 'event') => {
    void refreshSummarySoft(undefined, reason)
  })

  useEffect(() => {
    summaryRef.current = summary
  }, [summary])

  async function loadInitialSummary(signal?: AbortSignal) {
    setLoading(true)
    setError(null)

    try {
      const [base, nextCapabilitySnapshot] = await Promise.all([
        fetchWorkspaceSummaryBase(signal, 'initial'),
        fetchWorkspaceCapabilitiesSnapshot(signal).catch(() => null),
      ])
      if (signal?.aborted) {
        return
      }

      startTransition(() => {
        setSummary(base)
        setCapabilitySnapshot(nextCapabilitySnapshot)
      })
    } catch (caughtError) {
      if (signal?.aborted) {
        return
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to load workspace summary.',
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  async function performSoftRefresh(
    signal?: AbortSignal,
    reason: SummaryRequestReason = 'event',
  ) {
    setError(null)

    try {
      const [base, nextCapabilitySnapshot] = await Promise.all([
        fetchWorkspaceSummaryBase(signal, reason),
        fetchWorkspaceCapabilitiesSnapshot(signal).catch(() => null),
      ])
      if (signal?.aborted) {
        return
      }

      const previous = summaryRef.current
      const merged = mergeWorkspaceSummaryDiagnostics(base, previous)

      startTransition(() => {
        setSummary(merged)
        if (nextCapabilitySnapshot) {
          setCapabilitySnapshot(nextCapabilitySnapshot)
        }
      })
    } catch (caughtError) {
      if (signal?.aborted) {
        return
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to load workspace summary.',
      )
    }
  }

  async function refreshSummarySoft(
    signal?: AbortSignal,
    reason: SummaryRequestReason = 'event',
  ) {
    if (softRefreshInFlightRef.current) {
      softRefreshQueuedRef.current = true
      softRefreshCoalescedCountRef.current += 1
      return softRefreshInFlightRef.current
    }

    const run = (async () => {
      do {
        softRefreshQueuedRef.current = false
        await performSoftRefresh(signal, reason)
      } while (softRefreshQueuedRef.current && !signal?.aborted)
    })().finally(() => {
      softRefreshInFlightRef.current = null
      softRefreshQueuedRef.current = false
    })

    softRefreshInFlightRef.current = run
    return run
  }

  async function refreshSummaryFull(signal?: AbortSignal) {
    setLoading(true)
    setError(null)

    try {
      const [full, nextCapabilitySnapshot] = await Promise.all([
        fetchWorkspaceSummary(signal, 'manual-refresh'),
        fetchWorkspaceCapabilitiesSnapshot(signal).catch(() => null),
      ])
      if (signal?.aborted) {
        return
      }

      startTransition(() => {
        setSummary(full)
        if (nextCapabilitySnapshot) {
          setCapabilitySnapshot(nextCapabilitySnapshot)
        }
      })
    } catch (caughtError) {
      if (signal?.aborted) {
        return
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to load workspace summary.',
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  async function handleOpenAction(
    relativePath: string,
    target:
      | 'failure-report'
      | 'manifest'
      | 'preview'
      | 'readme'
      | 'repo'
      | 'terminal'
      | 'troubleshooting',
  ) {
    const pendingKey = `${relativePath}:${target}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await openRepoTarget(relativePath, target)
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open the requested target.',
      )
    } finally {
      if (target === 'preview') {
        await refreshSummarySoft(undefined, 'action')
      }

      setActionPendingKey(null)
    }
  }

  async function handleOpenWorkspacePath(targetPath: string) {
    setActionError(null)

    try {
      await openWorkspacePath(targetPath)
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open the requested workspace path.',
      )
    }
  }

  async function handleOpenCoreServiceAction(
    serviceId: string,
    target:
      | 'cache'
      | 'docs'
      | 'exports'
      | 'graph'
      | 'graph-folder'
      | 'readme'
      | 'repo'
      | 'storage'
      | 'terminal',
    targetPath?: string | null,
  ) {
    const pendingKey = `service:${serviceId}:${target}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await openCoreServiceTarget(serviceId, target, targetPath ?? null)
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open the requested service target.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleRuntimeAction(
    relativePath: string,
    action: 'restart' | 'start' | 'stop',
  ) {
    const pendingKey = `${relativePath}:${action}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await runRepoRuntimeAction(relativePath, action)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the repo action.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleInstallAction(relativePath: string) {
    const pendingKey = `${relativePath}:install`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await runRepoInstall(relativePath)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to install repo dependencies.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleCoreServiceInstallAction(serviceId: string) {
    const pendingKey = `service:${serviceId}:install`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await runCoreServiceInstall(serviceId)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to install the service runtime.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleCoreServiceRuntimeAction(
    serviceId: string,
    action: 'restart' | 'start' | 'stop',
  ) {
    const pendingKey = `service:${serviceId}:${action}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await runCoreServiceRuntimeAction(serviceId, action)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the service action.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleCoreServiceSyncAction(serviceId: string) {
    const pendingKey = `service:${serviceId}:sync`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await syncCoreService(serviceId)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to sync the service repo.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleWorkspaceCapabilityAction(
    capabilityId: string,
    action: 'disable' | 'enable' | 'install' | 'uninstall' | 'update',
  ) {
    const pendingKey = `capability:${capabilityId}:${action}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await runWorkspaceCapabilityAction(capabilityId, action)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the workspace capability action.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleOpenWorkspaceCapabilityAction(
    capabilityId: string,
    target: 'docs' | 'readme' | 'repo',
  ) {
    const pendingKey = `capability:${capabilityId}:open:${target}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await openWorkspaceCapabilityTarget(capabilityId, target)
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open the requested capability target.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleCoreServiceCommandAction(
    commandId: WorkspaceCoreServiceCommandId,
    options: {
      searchQuery?: string | null
    } = {},
  ) {
    const service = selectedService
    if (!service) {
      return
    }

    const pendingKey = `service:${service.id}:${commandId}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      const result = await runCoreServiceCommand(service.id, {
        commandId,
        repoRelativePath: mempalaceTargetContext?.repoRelativePath ?? null,
        searchQuery: options.searchQuery ?? null,
      })
      setMempalaceCommandOutput(
        result.output.trim().length > 0 ? `$ ${result.command}\n${result.output}` : `$ ${result.command}`,
      )
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to run the workspace memory command.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleIntakeAction(relativePath: string) {
    const pendingKey = `${relativePath}:intake`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      const payload = await runRepoIntake(relativePath)
      startTransition(() => {
        setIntakeResultsByPath((currentValue) => ({
          ...currentValue,
          [relativePath]: payload.result,
        }))
      })
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to initialize repo docs and metadata.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleStopAllAction() {
    const pendingKey = 'runtime:stop-all'
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await stopAllRuntimes()
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to stop managed runtimes.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleCoverAction(relativePath: string) {
    const pendingKey = `${relativePath}:cover`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await generateRepoCover(relativePath)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create a repo cover image.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleSaveMetadata(
    relativePath: string,
    metadata: {
      buildCommand?: string
      devCommand?: string
      externalUrl?: string
      healthcheckUrl?: string
      notes: string
      pinned: boolean
      preferredMode: 'direct' | 'external' | 'servbay'
      previewUrl?: string
      tags: string[]
    },
  ) {
    const pendingKey = `${relativePath}:save-metadata`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await saveRepoMetadata(relativePath, metadata)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save repo metadata.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleResetMetadata(relativePath: string) {
    const pendingKey = `${relativePath}:reset-metadata`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await resetRepoMetadata(relativePath)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to reset repo metadata.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleWriteManifest(
    relativePath: string,
    manifest: {
      buildCommand?: string
      devCommand?: string
      externalUrl?: string
      healthcheckUrl?: string
      installCommand?: string
      name: string
      notes?: string
      packageManager?: string
      preferredMode: 'direct' | 'external' | 'servbay'
      previewCommand?: string
      previewUrl?: string
      servbayPath?: string
      servbaySubdomain?: string
      slug: string
      tags?: string[]
      type: RepoType
    },
  ) {
    const pendingKey = `${relativePath}:write-manifest`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await writeRepoManifest(relativePath, manifest)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to write repo manifest.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  async function handleApplyAgentPreset(
    relativePath: string,
    preset: RepoAgentPresetId,
  ) {
    const pendingKey = `${relativePath}:agent-preset:${preset}`
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await applyRepoAgentPreset(relativePath, preset)
      await refreshSummarySoft(undefined, 'action')
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to apply the repo agent preset.',
      )
    } finally {
      setActionPendingKey(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    void loadInitialSummary(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    applyThemePreference(themePreference)
    persistThemePreference(themePreference)
  }, [themePreference])

  useEffect(() => {
    persistRepoLayoutMode(repoLayoutMode)
  }, [repoLayoutMode])

  useEffect(() => {
    const query = deferredSearchTerm.trim()

    if (query.length < 2) {
      setIndexedSearchError(null)
      setIndexedSearchLoading(false)
      setIndexedSearchResults([])
      return
    }

    const controller = new AbortController()
    setIndexedSearchLoading(true)
    setIndexedSearchError(null)

    void searchWorkspace(query, indexedSearchMode, controller.signal)
      .then((payload) => {
        setIndexedSearchResults(payload.results)
      })
      .catch((caughtError) => {
        if (controller.signal.aborted) {
          return
        }

        setIndexedSearchError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load indexed search results.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIndexedSearchLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [deferredSearchTerm, indexedSearchMode, summary?.generatedAt])

  useEffect(() => {
    const unsubscribe = subscribeWorkspaceEvents(
      (event) => {
        setLiveEventLabel(formatLiveEvent(event))

        if (liveRefreshTimeoutRef.current !== null) {
          return
        }

        const delay = event.type.endsWith('log') ? 500 : 120
        liveRefreshTimeoutRef.current = window.setTimeout(() => {
          liveRefreshTimeoutRef.current = null
          triggerSoftRefresh('event')
        }, delay)
      },
      setLiveStatus,
    )

    return () => {
      unsubscribe()

      if (liveRefreshTimeoutRef.current !== null) {
        window.clearTimeout(liveRefreshTimeoutRef.current)
        liveRefreshTimeoutRef.current = null
      }
    }
  }, [])

  const availableTypes = summary
    ? [...new Set(summary.repos.map((repo) => repo.type))].sort()
    : []
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase()
  const filteredRepos = summary
    ? sortReposForDisplay(filterRepos(summary.repos, normalizedSearch, selectedFilter))
    : []
  const filteredArchives = summary
    ? filterArchives(summary.archives, normalizedSearch)
    : []
  const capabilities = capabilitySnapshot?.capabilities ?? summary?.capabilities ?? []
  const coreServices = summary?.coreServices ?? []

  useEffect(() => {
    const nextFilteredRepos = summary
      ? filterRepos(summary.repos, normalizedSearch, selectedFilter)
      : []
    const nextSelectedPath = resolveSelectedRepoPath(
      repoLayoutMode,
      nextFilteredRepos.map((repo) => repo.path),
      selectedPath,
      pickDefaultRepo(nextFilteredRepos)?.path ?? nextFilteredRepos[0]?.path ?? null,
    )

    if (nextSelectedPath !== selectedPath) {
      setSelectedPath(nextSelectedPath)
    }
  }, [
    normalizedSearch,
    repoLayoutMode,
    selectedPath,
    selectedFilter,
    summary,
  ])

  useEffect(() => {
    const nextCoreServices = summary?.coreServices ?? []

    if (!nextCoreServices.length) {
      setSelectedServiceId(null)
      return
    }

    if (
      !selectedServiceId ||
      !nextCoreServices.some((service) => service.id === selectedServiceId)
    ) {
      setSelectedServiceId(nextCoreServices[0]?.id ?? null)
    }
  }, [selectedServiceId, summary])

  const selectedRepo = selectedPath
    ? filteredRepos.find((repo) => repo.path === selectedPath) ?? null
    : null
  const selectedService =
    coreServices.find((service) => service.id === selectedServiceId) ?? coreServices[0] ?? null
  const mempalaceService = coreServices.find((service) => service.id === 'mempalace') ?? null

  useEffect(() => {
    if (!summary?.repos.length) {
      setMempalaceTargetRepoRelativePath(null)
      return
    }

    if (
      !mempalaceTargetRepoRelativePath ||
      !summary.repos.some((repo) => repo.relativePath === mempalaceTargetRepoRelativePath)
    ) {
      setMempalaceTargetRepoRelativePath(
        selectedRepo?.relativePath ?? summary.repos[0]?.relativePath ?? null,
      )
    }
  }, [mempalaceTargetRepoRelativePath, selectedRepo, summary?.repos])

  useEffect(() => {
    if (workspaceView !== 'mempalace' || selectedService?.id !== 'mempalace') {
      return
    }

    void fetchCoreServiceTargetContext(selectedService.id, {
      currentRepoRelativePath: selectedRepo?.relativePath ?? null,
      repoRelativePath: mempalaceTargetRepoRelativePath,
      targetKind: mempalaceTargetKind,
    })
      .then((context) => {
        setMempalaceTargetContext(context)
      })
      .catch((caughtError) => {
        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load MemPalace target context.',
        )
      })
  }, [
    mempalaceTargetKind,
    mempalaceTargetRepoRelativePath,
    selectedRepo?.relativePath,
    selectedService?.id,
    summary?.generatedAt,
    workspaceView,
  ])

  useEffect(() => {
    if (!selectedRepo) {
      return
    }

    if (lastRecordedSelectionRef.current === selectedRepo.relativePath) {
      return
    }

    lastRecordedSelectionRef.current = selectedRepo.relativePath

    void recordRepoActivity(selectedRepo.relativePath, 'select')
      .then(async () => {
        triggerSoftRefresh('action')
      })
      .catch((caughtError) => {
        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to record repo selection.',
        )
      })
  }, [selectedRepo])

  useEffect(() => {
    if (workspaceView !== 'dashboard' || !selectedRepo) {
      return
    }

    if (
      selectedRepo.detailLevel === 'detail' &&
      selectedRepo.diagnosticsFreshness === 'fresh' &&
      selectedRepo.sideLoad !== undefined
    ) {
      return
    }

    if (repoDetailsInFlightRef.current === selectedRepo.relativePath) {
      return
    }

    const controller = new AbortController()
    const targetRelativePath = selectedRepo.relativePath
    repoDetailsInFlightRef.current = targetRelativePath
    repoDetailsHydrationCountRef.current += 1

    void fetchWorkspaceRepoDetails(targetRelativePath, controller.signal)
      .then((detailedRepo) => {
        startTransition(() => {
          setSummary((currentSummary) =>
            currentSummary
              ? mergeWorkspaceRepoDetails(currentSummary, detailedRepo)
              : currentSummary,
          )
        })
      })
      .catch((caughtError) => {
        if (controller.signal.aborted) {
          return
        }

        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to hydrate repo diagnostics.',
        )
      })
      .finally(() => {
        if (repoDetailsInFlightRef.current === targetRelativePath) {
          repoDetailsInFlightRef.current = null
        }
      })

    return () => {
      controller.abort()
    }
  }, [selectedRepo, workspaceView])

  const generatedAt = summary ? formatGeneratedAt(summary.generatedAt) : 'Waiting for API'
  const refreshDebugLabel = `Refresh stats: coalesced ${softRefreshCoalescedCountRef.current}, selected detail hydrations ${repoDetailsHydrationCountRef.current}`

  function handleThemePresetChange(preset: ThemePreset) {
    setThemePreference((currentPreference) => ({
      ...currentPreference,
      preset,
    }))
  }

  function handleThemeModeChange(mode: ThemeMode) {
    setThemePreference((currentPreference) => ({
      ...currentPreference,
      mode,
    }))
  }

  function handleSelectIndexedRepo(relativePath: string) {
    const nextRepo = summary?.repos.find((repo) => repo.relativePath === relativePath)

    if (!nextRepo) {
      return
    }

    setSelectedFilter('all')
    setSelectedPath(nextRepo.path)
    setWorkspaceView('dashboard')
  }

  function handleSelectIndexedService(serviceId: string) {
    setSelectedServiceId(serviceId)
    if (serviceId === 'mempalace') {
      setWorkspaceView('mempalace')
    }
  }

  function handleSelectIndexedCapability(capabilityId: string) {
    const capability =
      capabilities.find((entry) => entry.id === capabilityId)
      ?? summary?.capabilities.find((entry) => entry.id === capabilityId)

    if (!capability) {
      return
    }

    setWorkspaceView('dashboard')
    setSelectedCapabilityId(capabilityId)

    if (capability.installed) {
      return
    }
  }

  function handleOpenDashboardView() {
    setWorkspaceView('dashboard')
  }

  function handleOpenMempalaceWorkspace() {
    if (!mempalaceService) {
      return
    }

    setSelectedServiceId(mempalaceService.id)
    setWorkspaceView('mempalace')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel reveal">
        <div className="hero-grid">
          <div className="hero-main">
            <div className="hero-copy">
              <p className="eyebrow">Codex Workspace Control Centre</p>
              <h1>Workspace Hub</h1>
              <p className="hero-text">
                A local dashboard for discovering repositories, tracking runtime
                state, and keeping direct previews as the default path.
              </p>
            </div>

            <div className="workspace-nav" aria-label="Workspace sections">
              <button
                className={`workspace-nav-button ${workspaceView === 'dashboard' ? 'active' : ''}`}
                onClick={handleOpenDashboardView}
                type="button"
              >
                Dashboard
              </button>
              <button
                className={`workspace-nav-button ${workspaceView === 'mempalace' ? 'active' : ''}`}
                disabled={!mempalaceService}
                onClick={handleOpenMempalaceWorkspace}
                type="button"
              >
                Workspace memory
              </button>
            </div>

            <div className="hero-actions">
              <button
                className="primary-button"
                disabled={loading}
                onClick={() => {
                  void refreshSummaryFull()
                }}
                type="button"
              >
                {loading ? 'Refreshing snapshot...' : 'Refresh snapshot'}
              </button>

              <a className="secondary-link" href="/api/health" rel="noreferrer" target="_blank">
                API health
              </a>

              <a
                className="secondary-link"
                href="/api/workspace/observability"
                rel="noreferrer"
                target="_blank"
              >
                Observability
              </a>
            </div>

            <div className="hero-meta">
              <span>Workspace root: {summary?.workspaceRoot ?? 'Loading...'}</span>
              <span>Last sync: {generatedAt}</span>
              <span>{`Live updates: ${liveStatus} • ${liveEventLabel}`}</span>
              <span title={refreshDebugLabel}>Refresh optimization active</span>
            </div>
          </div>

          <ThemeControls
            mode={themePreference.mode}
            onModeChange={handleThemeModeChange}
            onPresetChange={handleThemePresetChange}
            onRepoLayoutModeChange={setRepoLayoutMode}
            preset={themePreference.preset}
            repoLayoutMode={repoLayoutMode}
          />
        </div>
      </header>

      <StatusStrip
        liveLabel={liveEventLabel}
        liveStatus={liveStatus}
        loading={loading}
        onStopAll={() => {
          void handleStopAllAction()
        }}
        stopAllPending={actionPendingKey === 'runtime:stop-all'}
        summary={summary}
      />

      {error ? (
        <section className="message-banner reveal" aria-live="polite">
          <strong>Backend error.</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {workspaceView === 'mempalace' && selectedService?.id === 'mempalace' ? (
        <MempalaceWorkspacePage
          actionError={actionError}
          actionPendingKey={actionPendingKey}
          commandOutput={mempalaceCommandOutput}
          context={mempalaceTargetContext}
          loading={loading}
          onInstallAction={handleCoreServiceInstallAction}
          onOpenAction={handleOpenCoreServiceAction}
          onReturnToDashboard={() => {
            handleOpenDashboardView()
          }}
          onRunCommand={handleCoreServiceCommandAction}
          onSearchAction={async (query) => {
            await handleCoreServiceCommandAction('search', { searchQuery: query })
          }}
          onTargetKindChange={setMempalaceTargetKind}
          onTargetRepoChange={setMempalaceTargetRepoRelativePath}
          repos={summary?.repos ?? []}
          selectedRepoRelativePath={mempalaceTargetRepoRelativePath}
          selectedTargetKind={mempalaceTargetKind}
          service={selectedService}
        />
      ) : (
        <main className="dashboard-grid">
          <section
            className={`dashboard-main ${
              repoLayoutMode === 'discovery-first'
                ? 'dashboard-main-discovery'
                : 'dashboard-main-split'
            }`}
          >
            <div className="dashboard-primary dashboard-primary-discovery">
              <RepoSnapshot
                availableTypes={availableTypes}
                filteredArchives={filteredArchives}
                filteredRepos={filteredRepos}
                indexedSearchError={indexedSearchError}
                indexedSearchLoading={indexedSearchLoading}
                indexedSearchResults={indexedSearchResults}
                loading={loading}
                onOpenIndexedPath={handleOpenWorkspacePath}
                onSearchChange={setSearchTerm}
                onSearchModeChange={setIndexedSearchMode}
                onSelectIndexedCapability={handleSelectIndexedCapability}
                onSelectIndexedRepo={handleSelectIndexedRepo}
                onSelectIndexedService={handleSelectIndexedService}
                onSelectRepo={(nextPath) => {
                  setSelectedPath(nextPath)
                  handleOpenDashboardView()
                }}
                onFilterChange={setSelectedFilter}
                onToggleArchived={() => {
                  setShowArchived((currentValue) => !currentValue)
                }}
                repoLayoutMode={repoLayoutMode}
                searchTerm={searchTerm}
                searchMode={indexedSearchMode}
                selectedRepoInlineDetails={
                  repoLayoutMode === 'discovery-first' && selectedRepo ? (
                    <RepoDetails
                      actionError={actionError}
                      actionPendingKey={actionPendingKey}
                      embedded
                      onApplyAgentPreset={handleApplyAgentPreset}
                      onCoverAction={handleCoverAction}
                      onInstallAction={handleInstallAction}
                      onIntakeAction={handleIntakeAction}
                      onCopyError={setActionError}
                      loading={loading}
                      onOpenAction={handleOpenAction}
                      onOpenWorkspacePath={handleOpenWorkspacePath}
                      onResetMetadata={handleResetMetadata}
                    onRuntimeAction={handleRuntimeAction}
                    onSaveMetadata={handleSaveMetadata}
                    intakeResult={intakeResultsByPath[selectedRepo.relativePath] ?? null}
                    onWriteManifest={handleWriteManifest}
                    repo={selectedRepo}
                  />
                  ) : null
                }
                selectedPath={selectedPath}
                selectedFilter={selectedFilter}
                showArchived={showArchived}
              />

            </div>

            <div className="dashboard-sidebar">
              {repoLayoutMode === 'split' ? (
                <RepoDetails
                  actionError={actionError}
                  actionPendingKey={actionPendingKey}
                  onApplyAgentPreset={handleApplyAgentPreset}
                  onCoverAction={handleCoverAction}
                  onIntakeAction={handleIntakeAction}
                  onInstallAction={handleInstallAction}
                  onCopyError={setActionError}
                  loading={loading}
                  onOpenAction={handleOpenAction}
                  onOpenWorkspacePath={handleOpenWorkspacePath}
                  onResetMetadata={handleResetMetadata}
                  onRuntimeAction={handleRuntimeAction}
                  onSaveMetadata={handleSaveMetadata}
                  intakeResult={selectedRepo ? intakeResultsByPath[selectedRepo.relativePath] ?? null : null}
                  onWriteManifest={handleWriteManifest}
                  repo={selectedRepo}
                />
              ) : null}
              <CoreServicesPanel
                actionPendingKey={actionPendingKey}
                loading={loading}
                onInstallAction={handleCoreServiceInstallAction}
                onOpenAction={handleOpenCoreServiceAction}
                onOpenServiceWorkspace={(serviceId) => {
                  setSelectedServiceId(serviceId)
                  if (serviceId === 'mempalace') {
                    handleOpenMempalaceWorkspace()
                  }
                }}
                onRuntimeAction={handleCoreServiceRuntimeAction}
                onSelectService={setSelectedServiceId}
                onSyncAction={handleCoreServiceSyncAction}
                selectedServiceId={selectedServiceId}
                services={coreServices}
              />
              <WorkspaceCapabilitiesPanel
                actionPendingKey={actionPendingKey}
                capabilities={capabilities}
                snapshot={capabilitySnapshot}
                loading={loading}
                onAction={handleWorkspaceCapabilityAction}
                onOpenAction={handleOpenWorkspaceCapabilityAction}
                onSelectCapability={setSelectedCapabilityId}
                selectedCapabilityId={selectedCapabilityId}
              />
              {selectedService && selectedService.id !== 'mempalace' ? (
                <CoreServiceDetails
                  actionError={actionError}
                  actionPendingKey={actionPendingKey}
                  onInstallAction={handleCoreServiceInstallAction}
                  onOpenAction={handleOpenCoreServiceAction}
                  onRuntimeAction={handleCoreServiceRuntimeAction}
                  onSyncAction={handleCoreServiceSyncAction}
                  service={selectedService}
                />
              ) : null}
              <SettingsPanel
                loading={loading}
                repoLayoutMode={repoLayoutMode}
                summary={summary}
              />

              <SectionCard
                body="The current build stays deliberately practical: discovery, runtime controls, saved overrides, manifest authoring, diagnostics, install recovery, and quicker pinned workflows are in place."
                className="reveal delayed"
                collapsible
                defaultOpen={false}
                eyebrow="Build Track"
                title="Next milestones"
              >
                <ul className="milestone-list">
                  {summary?.milestones.map((milestone) => (
                    <li key={milestone.title} className={`milestone ${milestone.status}`}>
                      <div>
                        <span className="milestone-status">{milestone.status}</span>
                        <h3>{milestone.title}</h3>
                      </div>
                      <p>{milestone.description}</p>
                    </li>
                  )) ?? (
                    <li className="milestone">
                      <div>
                        <span className="milestone-status">loading</span>
                        <h3>Loading milestones</h3>
                      </div>
                      <p>The API will populate the next stages once it responds.</p>
                    </li>
                  )}
                </ul>
              </SectionCard>

              <SectionCard
                body="These defaults mirror the handover pack so future actions do not drift into a one-size-fits-all runtime."
                className="reveal delayed-more"
                collapsible
                defaultOpen={false}
                eyebrow="Operating Rules"
                title="Current assumptions"
              >
                <ul className="rule-list">
                  <li>Repos remain independently runnable and keep their own installs.</li>
                  <li>Frontend-style projects default to direct local previews.</li>
                  <li>WordPress repos usually stay external unless a repo says otherwise.</li>
                  <li>Optional reverse-proxy or mapped-host previews stay optional, not a hard dependency.</li>
                </ul>
              </SectionCard>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
