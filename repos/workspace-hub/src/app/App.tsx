import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'

import { RepoDetails } from '../features/repos/RepoDetails.tsx'
import { SectionCard } from '../components/SectionCard.tsx'
import { RepoSnapshot } from '../features/repos/RepoSnapshot.tsx'
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
  fetchWorkspaceSummary,
  generateRepoCover,
  openRepoTarget,
  recordRepoActivity,
  resetRepoMetadata,
  runRepoInstall,
  runRepoRuntimeAction,
  saveRepoMetadata,
  stopAllRuntimes,
  writeRepoManifest,
} from '../lib/api.ts'
import type { RepoType, WorkspaceRepo, WorkspaceSummary } from '../types/workspace.ts'

import './app.css'

type RepoFilterValue = RepoType | 'all' | 'external' | 'runnable'
type AppProps = {
  initialThemePreference: ThemePreference
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
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

export function App({ initialThemePreference }: AppProps) {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPendingKey, setActionPendingKey] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<RepoFilterValue>('all')
  const [themePreference, setThemePreference] = useState(initialThemePreference)
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const lastRecordedSelectionRef = useRef<string | null>(null)

  async function loadSummary(signal?: AbortSignal, showLoading = true) {
    if (showLoading) {
      setLoading(true)
    }

    setError(null)

    try {
      const nextSummary = await fetchWorkspaceSummary(signal)
      startTransition(() => {
        setSummary(nextSummary)
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
      if (!signal?.aborted && showLoading) {
        setLoading(false)
      }
    }
  }

  async function handleOpenAction(
    relativePath: string,
    target:
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
        await loadSummary(undefined, false)
      }

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
      await loadSummary(undefined, false)
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
      await loadSummary(undefined, false)
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

  async function handleStopAllAction() {
    const pendingKey = 'runtime:stop-all'
    setActionPendingKey(pendingKey)
    setActionError(null)

    try {
      await stopAllRuntimes()
      await loadSummary(undefined, false)
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
      await loadSummary(undefined, false)
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
      await loadSummary(undefined, false)
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
      await loadSummary(undefined, false)
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
      await loadSummary(undefined, false)
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

  useEffect(() => {
    const controller = new AbortController()

    void loadSummary(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    applyThemePreference(themePreference)
    persistThemePreference(themePreference)
  }, [themePreference])

  const availableTypes = summary
    ? [...new Set(summary.repos.map((repo) => repo.type))].sort()
    : []
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase()
  const filteredRepos = summary
    ? filterRepos(summary.repos, normalizedSearch, selectedFilter)
    : []

  useEffect(() => {
    const nextFilteredRepos = summary
      ? filterRepos(summary.repos, normalizedSearch, selectedFilter)
      : []

    if (!nextFilteredRepos.length) {
      setSelectedPath(null)
      return
    }

    if (
      !selectedPath ||
      !nextFilteredRepos.some((repo) => repo.path === selectedPath)
    ) {
      setSelectedPath(pickDefaultRepo(nextFilteredRepos)?.path ?? nextFilteredRepos[0].path)
    }
  }, [
    normalizedSearch,
    selectedPath,
    selectedFilter,
    summary,
  ])

  const selectedRepo =
    filteredRepos.find((repo) => repo.path === selectedPath) ??
    pickDefaultRepo(filteredRepos) ??
    null

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
        await loadSummary(undefined, false)
      })
      .catch((caughtError) => {
        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to record repo selection.',
        )
      })
  }, [selectedRepo])

  const generatedAt = summary ? formatGeneratedAt(summary.generatedAt) : 'Waiting for API'

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

            <div className="hero-actions">
              <button
                className="primary-button"
                disabled={loading}
                onClick={() => {
                  void loadSummary()
                }}
                type="button"
              >
                {loading ? 'Refreshing snapshot...' : 'Refresh snapshot'}
              </button>

              <a className="secondary-link" href="/api/health" rel="noreferrer" target="_blank">
                API health
              </a>
            </div>

            <div className="hero-meta">
              <span>Workspace root: {summary?.workspaceRoot ?? 'Loading...'}</span>
              <span>Last sync: {generatedAt}</span>
            </div>
          </div>

          <ThemeControls
            mode={themePreference.mode}
            onModeChange={handleThemeModeChange}
            onPresetChange={handleThemePresetChange}
            preset={themePreference.preset}
          />
        </div>
      </header>

      <StatusStrip
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

      <main className="dashboard-grid">
        <section className="dashboard-workbench">
          <div className="dashboard-column">
            <RepoSnapshot
              availableTypes={availableTypes}
              filteredRepos={filteredRepos}
              loading={loading}
              onSearchChange={setSearchTerm}
              onSelectRepo={setSelectedPath}
              onFilterChange={setSelectedFilter}
              searchTerm={searchTerm}
              selectedPath={selectedPath}
              selectedFilter={selectedFilter}
            />
          </div>

          <div className="dashboard-column">
            <RepoDetails
              actionError={actionError}
              actionPendingKey={actionPendingKey}
              onCoverAction={handleCoverAction}
              onInstallAction={handleInstallAction}
              onCopyError={setActionError}
              loading={loading}
              onOpenAction={handleOpenAction}
              onResetMetadata={handleResetMetadata}
              onRuntimeAction={handleRuntimeAction}
              onSaveMetadata={handleSaveMetadata}
              onWriteManifest={handleWriteManifest}
              repo={selectedRepo}
            />
          </div>
        </section>

        <section className="dashboard-masonry">
          <div className="dashboard-masonry-item">
            <SettingsPanel loading={loading} summary={summary} />
          </div>

          <div className="dashboard-masonry-item">
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
          </div>

          <div className="dashboard-masonry-item">
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
                <li>ServBay remains optional convenience, not a hard dependency.</li>
              </ul>
            </SectionCard>
          </div>
        </section>
      </main>
    </div>
  )
}
