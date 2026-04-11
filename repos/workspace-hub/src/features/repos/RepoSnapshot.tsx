import { type ReactNode, useState } from 'react'

import { SectionCard } from '../../components/SectionCard.tsx'
import { collectAgentToolingLabels, formatAgentToolingSummary } from './agentTooling.ts'
import type { RepoLayoutMode } from '../layout/repoLayout.ts'
import type {
  RepoType,
  WorkspaceArchive,
  WorkspaceRepo,
  WorkspaceSearchResult,
} from '../../types/workspace.ts'

type RepoFilterValue =
  | RepoType
  | 'all'
  | 'external'
  | 'pinned'
  | 'recent'
  | 'runnable'

type RepoSnapshotProps = {
  availableTypes: RepoType[]
  filteredArchives: WorkspaceArchive[]
  filteredRepos: WorkspaceRepo[]
  indexedSearchError: string | null
  indexedSearchLoading: boolean
  indexedSearchResults: WorkspaceSearchResult[]
  loading: boolean
  onFilterChange: (value: RepoFilterValue) => void
  onOpenIndexedPath: (targetPath: string) => Promise<void>
  onSearchChange: (value: string) => void
  onSearchModeChange: (value: WorkspaceSearchResult['mode']) => void
  onSelectIndexedCapability: (capabilityId: string) => void
  onSelectIndexedRepo: (relativePath: string) => void
  onSelectIndexedService: (serviceId: string) => void
  onSelectRepo: (path: string) => void
  onToggleArchived: () => void
  repoLayoutMode: RepoLayoutMode
  searchTerm: string
  searchMode: WorkspaceSearchResult['mode']
  selectedRepoInlineDetails: ReactNode
  selectedPath: string | null
  selectedFilter: RepoFilterValue
  showArchived: boolean
}

type RepoSnapshotCardProps = {
  repo: WorkspaceRepo
  selected: boolean
}

type ArchiveSnapshotCardProps = {
  archive: WorkspaceArchive
}

type IndexedSearchCardProps = {
  onOpenIndexedPath: (targetPath: string) => Promise<void>
  onSelectIndexedCapability: (capabilityId: string) => void
  onSelectIndexedRepo: (relativePath: string) => void
  onSelectIndexedService: (serviceId: string) => void
  result: WorkspaceSearchResult
}

type IndexedSearchFilterValue =
  | 'all'
  | 'artifact'
  | 'capability'
  | 'failure-report'
  | 'repo'
  | 'service'

function formatBranchLabel(repo: WorkspaceRepo) {
  if (repo.git.branch) {
    return repo.git.branch
  }

  if (!repo.git.hasGit) {
    return 'no git'
  }

  return 'detached'
}

function formatGitVisibilityLabel(repo: WorkspaceRepo) {
  if (repo.git.visibility === 'local-only') {
    return 'local'
  }

  return repo.git.visibility
}

function formatRecentLabel(repo: WorkspaceRepo) {
  const value =
    repo.recent.lastSelectedAt ?? repo.recent.lastActionAt ?? repo.recent.lastOpenedAt

  if (!value) {
    return null
  }

  const prefix = repo.recent.lastSelectedAt
    ? 'selected'
    : repo.recent.lastActionKind
      ? repo.recent.lastActionKind
      : 'opened'

  return `${prefix} ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))}`
}

function formatArchiveFolder(relativePath: string) {
  const segments = relativePath.split('/')

  return segments.slice(0, -1).join('/') || 'repos'
}

function RepoSnapshotCard({
  repo,
  selected,
}: RepoSnapshotCardProps) {
  const showDependencyWarning =
    repo.dependencies.state === 'missing' || repo.dependencies.state === 'unknown'
  const agentLabels = collectAgentToolingLabels(repo.agentTooling)
  const recentLabel = formatRecentLabel(repo)
  const footerDetail = recentLabel
    ? recentLabel
    : agentLabels.length
      ? `agent ${formatAgentToolingSummary(repo.agentTooling)}`
      : repo.runtime.pid
        ? `pid ${repo.runtime.pid}`
        : repo.hasManifest
          ? 'manifest-backed'
          : repo.detectedBy

  return (
    <span className={`repo-card ${selected ? 'active' : ''}`}>
      <span className="repo-card-header">
        <strong>{repo.name}</strong>
        <span className="repo-card-tags">
          {repo.isPinned ? <span className="tag pinned">pinned</span> : null}
          <span className={`status-pill ${repo.runtime.status}`}>
            {repo.runtime.status}
          </span>
          <span className="tag">{repo.type}</span>
          {agentLabels.slice(0, 2).map((label) => (
            <span key={label} className="tag">
              {label}
            </span>
          ))}
          {agentLabels.length > 2 ? <span className="tag">+{agentLabels.length - 2} agent</span> : null}
        </span>
      </span>
      <span className="repo-card-meta">
        <span>{repo.relativePath}</span>
        <span>{repo.preferredMode}</span>
        <span>{repo.packageManager || 'manual'}</span>
      </span>
      <span className="repo-card-diagnostics">
        <span className="repo-card-branch">git {formatBranchLabel(repo)}</span>
        <span className={`status-pill ${repo.diagnosticsFreshness}`}>
          {repo.diagnosticsFreshness}
        </span>
        <span className={`status-pill ${repo.git.visibility}`}>
          {formatGitVisibilityLabel(repo)}
        </span>
        {repo.git.state === 'dirty' ? (
          <span className="status-pill dirty">dirty</span>
        ) : null}
        {showDependencyWarning ? (
          <span className={`status-pill ${repo.dependencies.state}`}>
            {repo.dependencies.state === 'missing' ? 'deps missing' : 'deps unknown'}
          </span>
        ) : null}
      </span>
      <span className="repo-card-footer">
        <span>{repo.location === 'direct' ? 'direct repo' : repo.collection}</span>
        <span>{footerDetail}</span>
      </span>
    </span>
  )
}

function ArchiveSnapshotCard({ archive }: ArchiveSnapshotCardProps) {
  return (
    <span className="repo-card repo-card-archive">
      <span className="repo-card-header">
        <strong>{archive.name}</strong>
        <span className="repo-card-tags">
          <span className="tag">archive</span>
        </span>
      </span>
      <span className="repo-card-meta">
        <span>{archive.relativePath}</span>
      </span>
      <span className="repo-card-footer">
        <span>{formatArchiveFolder(archive.relativePath)}</span>
        <span>not runnable</span>
      </span>
    </span>
  )
}

function IndexedSearchCard({
  onOpenIndexedPath,
  onSelectIndexedCapability,
  onSelectIndexedRepo,
  onSelectIndexedService,
  result,
}: IndexedSearchCardProps) {
  const { capabilityId, filePath, repoRelativePath, serviceId } = result

  return (
    <article className="search-result-card">
      <div className="search-result-header">
        <strong>{result.title}</strong>
        <span className="repo-card-tags">
          <span className="tag">{result.category}</span>
          <span className="tag">{result.matchSource}</span>
        </span>
      </div>

      <p className="search-result-subtitle">{result.subtitle}</p>
      <p className="search-result-snippet">{result.snippet}</p>

      <div className="search-result-actions">
        {repoRelativePath ? (
          <button
            className="action-button"
            onClick={() => {
              onSelectIndexedRepo(repoRelativePath)
            }}
            type="button"
          >
            Select repo
          </button>
        ) : null}

        {serviceId ? (
          <button
            className="action-button"
            onClick={() => {
              onSelectIndexedService(serviceId)
            }}
            type="button"
          >
            View service
          </button>
        ) : null}

        {capabilityId ? (
          <button
            className="action-button"
            onClick={() => {
              onSelectIndexedCapability(capabilityId)
            }}
            type="button"
          >
            Open capability
          </button>
        ) : null}

        {filePath ? (
          <button
            className="action-button"
            onClick={() => {
              void onOpenIndexedPath(filePath)
            }}
            type="button"
          >
            Open file
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function RepoSnapshot({
  availableTypes,
  filteredArchives,
  filteredRepos,
  indexedSearchError,
  indexedSearchLoading,
  indexedSearchResults,
  loading,
  onFilterChange,
  onOpenIndexedPath,
  onSearchChange,
  onSearchModeChange,
  onSelectIndexedCapability,
  onSelectIndexedRepo,
  onSelectIndexedService,
  onSelectRepo,
  onToggleArchived,
  repoLayoutMode,
  searchTerm,
  searchMode,
  selectedRepoInlineDetails,
  selectedPath,
  selectedFilter,
  showArchived,
}: RepoSnapshotProps) {
  const [indexedSearchFilter, setIndexedSearchFilter] =
    useState<IndexedSearchFilterValue>('all')
  const showRepoSection = true
  const showArchiveSection = showArchived && filteredArchives.length > 0
  const showGroupedHeadings = showRepoSection && showArchiveSection
  const hasVisibleItems = filteredRepos.length > 0 || filteredArchives.length > 0
  const visibleIndexedResults =
    indexedSearchFilter === 'all'
      ? indexedSearchResults
      : indexedSearchResults.filter((result) => result.category === indexedSearchFilter)

  return (
    <SectionCard
      body="Sibling repos and visible archive files are discovered here. Filtering only changes the list view and does not modify anything on disk."
      className="wide reveal"
      eyebrow="Repo Discovery"
      title="Repo Discovery"
    >
      <div className="repo-toolbar">
        <label className="field">
          <span>Search</span>
          <input
            onChange={(event) => {
              onSearchChange(event.target.value)
              setIndexedSearchFilter('all')
            }}
            placeholder="name, path, type, tag, side-load"
            type="search"
            value={searchTerm}
          />
        </label>

        <label className="field compact">
          <span>Search mode</span>
          <select
            onChange={(event) => {
              onSearchModeChange(event.target.value as WorkspaceSearchResult['mode'])
              setIndexedSearchFilter('all')
            }}
            value={searchMode}
          >
            <option value="thin">Thin</option>
            <option value="deep">Deep</option>
          </select>
        </label>

        <label className="field compact">
          <span>Filter</span>
          <select
            onChange={(event) => {
              onFilterChange(event.target.value as RepoFilterValue)
            }}
            value={selectedFilter}
          >
            <option value="all">All items</option>
            <option value="runnable">Runnable repos</option>
            <option value="external">External repos</option>
            <option value="pinned">Pinned repos</option>
            <option value="recent">Recently active</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <button
          className={`action-button repo-archive-toggle ${showArchived ? 'active' : ''}`}
          onClick={onToggleArchived}
          type="button"
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      {searchTerm.trim().length >= 2 ? (
        <div className="indexed-search-group">
          <div className="discovery-section-heading">
            <span className="discovery-section-title">Indexed search</span>
            <span className="tag">
              {indexedSearchLoading ? '…' : visibleIndexedResults.length}
            </span>
          </div>

          <div className="search-filter-row" role="group" aria-label="Indexed search filters">
            {(
              [
                ['all', 'All'],
                ['repo', 'Repos'],
                ['service', 'Services'],
                ['capability', 'Capabilities'],
                ['failure-report', 'Failures'],
                ['artifact', 'Artifacts'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`search-filter-chip ${indexedSearchFilter === value ? 'active' : ''}`}
                onClick={() => {
                  setIndexedSearchFilter(value)
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {indexedSearchError ? (
            <div className="empty-state">
              <strong>Indexed search is unavailable.</strong>
              <p>{indexedSearchError}</p>
            </div>
          ) : visibleIndexedResults.length ? (
            <div className="search-result-list">
              {visibleIndexedResults.map((result) => (
                <IndexedSearchCard
                  key={result.id}
                  onOpenIndexedPath={onOpenIndexedPath}
                  onSelectIndexedCapability={onSelectIndexedCapability}
                  onSelectIndexedRepo={onSelectIndexedRepo}
                  onSelectIndexedService={onSelectIndexedService}
                  result={result}
                />
              ))}
            </div>
          ) : indexedSearchLoading ? (
            <p className="loading-copy">
              {searchMode === 'deep'
                ? 'Searching indexed metadata plus debug-only docs, logs, and artifacts...'
                : 'Searching indexed metadata and side-load summaries...'}
            </p>
          ) : (
            <div className="empty-state">
              <strong>No indexed matches for this filter yet.</strong>
              <p>
                {searchMode === 'deep'
                  ? 'Try a broader phrase or switch filters. Deep search includes debug-only docs and artifacts when available.'
                  : 'Try a broader phrase, switch filters, or use Deep mode for README, HANDOVER, log, and artifact content.'}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {loading && !hasVisibleItems ? (
        <p className="loading-copy">Scanning workspace roots...</p>
      ) : hasVisibleItems ? (
        <div className="discovery-groups">
          {repoLayoutMode === 'discovery-first' && !selectedPath ? (
            <div className="discovery-inline-guide">
              <strong>Select a repo to open details.</strong>
              <p>Discovery-first keeps Repo Discovery full width until you explicitly choose one.</p>
            </div>
          ) : null}

          {showRepoSection && filteredRepos.length ? (
            <div className="discovery-group">
              {showGroupedHeadings ? (
                <div className="discovery-section-heading">
                  <span className="discovery-section-title">Repositories</span>
                  <span className="tag">{filteredRepos.length}</span>
                </div>
              ) : null}
              <ul className="repo-list">
                {filteredRepos.map((repo) => {
                  const isSelected = repo.path === selectedPath
                  const showInlineDetails =
                    repoLayoutMode === 'discovery-first' && isSelected

                  return (
                    <li
                      key={repo.path}
                      className={`repo-list-item-shell ${
                        showInlineDetails ? 'with-inline-details active' : ''
                      }`}
                    >
                      <button
                        className="repo-button"
                        onClick={() => {
                          onSelectRepo(repo.path)
                        }}
                        type="button"
                      >
                        <RepoSnapshotCard
                          repo={repo}
                          selected={isSelected}
                        />
                      </button>
                      {showInlineDetails ? (
                        <div className="repo-card-selection repo-inline-details-shell">
                          {selectedRepoInlineDetails}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {showArchiveSection && filteredArchives.length ? (
            <div className="discovery-group">
              <div className="discovery-section-heading">
                <span className="discovery-section-title">Archive files</span>
                <span className="tag">{filteredArchives.length}</span>
              </div>
              <ul className="repo-list">
                {filteredArchives.map((archive) => (
                  <li key={archive.path}>
                    <ArchiveSnapshotCard archive={archive} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No items match the current filter.</strong>
          <p>Try clearing the search, changing the repo filter, or toggling archived items.</p>
        </div>
      )}
    </SectionCard>
  )
}
