import { SectionCard } from '../../components/SectionCard.tsx'
import { collectAgentToolingLabels, formatAgentToolingSummary } from './agentTooling.ts'
import type {
  RepoType,
  WorkspaceArchive,
  WorkspaceRepo,
  WorkspaceSearchResult,
} from '../../types/workspace.ts'

type RepoFilterValue =
  | RepoType
  | 'all'
  | 'archived'
  | 'external'
  | 'non-archived'
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
  onSelectIndexedRepo: (relativePath: string) => void
  onSelectRepo: (path: string) => void
  searchTerm: string
  selectedPath: string | null
  selectedFilter: RepoFilterValue
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
  onSelectIndexedRepo: (relativePath: string) => void
  result: WorkspaceSearchResult
}

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

function RepoSnapshotCard({ repo, selected }: RepoSnapshotCardProps) {
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
  onSelectIndexedRepo,
  result,
}: IndexedSearchCardProps) {
  const { filePath, repoRelativePath } = result

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
  onSelectIndexedRepo,
  onSelectRepo,
  searchTerm,
  selectedPath,
  selectedFilter,
}: RepoSnapshotProps) {
  const showRepoSection = selectedFilter !== 'archived'
  const showArchiveSection = selectedFilter === 'all' || selectedFilter === 'archived'
  const showGroupedHeadings = showRepoSection && showArchiveSection && filteredArchives.length > 0
  const hasVisibleItems = filteredRepos.length > 0 || filteredArchives.length > 0

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
            }}
            placeholder="name, path, type, tag, archive"
            type="search"
            value={searchTerm}
          />
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
            <option value="non-archived">Non-archived repos</option>
            <option value="archived">Archived files</option>
            <option value="runnable">Runnable repos</option>
            <option value="external">External repos</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {searchTerm.trim().length >= 2 ? (
        <div className="indexed-search-group">
          <div className="discovery-section-heading">
            <span className="discovery-section-title">Indexed search</span>
            <span className="tag">
              {indexedSearchLoading ? '…' : indexedSearchResults.length}
            </span>
          </div>

          {indexedSearchError ? (
            <div className="empty-state">
              <strong>Indexed search is unavailable.</strong>
              <p>{indexedSearchError}</p>
            </div>
          ) : indexedSearchResults.length ? (
            <div className="search-result-list">
              {indexedSearchResults.map((result) => (
                <IndexedSearchCard
                  key={result.id}
                  onOpenIndexedPath={onOpenIndexedPath}
                  onSelectIndexedRepo={onSelectIndexedRepo}
                  result={result}
                />
              ))}
            </div>
          ) : indexedSearchLoading ? (
            <p className="loading-copy">Searching indexed metadata, logs, and local artifacts...</p>
          ) : (
            <div className="empty-state">
              <strong>No indexed matches yet.</strong>
              <p>Try a broader phrase or search by branch, tag, manifest key, or error text.</p>
            </div>
          )}
        </div>
      ) : null}

      {loading && !hasVisibleItems ? (
        <p className="loading-copy">Scanning workspace roots...</p>
      ) : hasVisibleItems ? (
        <div className="discovery-groups">
          {showRepoSection && filteredRepos.length ? (
            <div className="discovery-group">
              {showGroupedHeadings ? (
                <div className="discovery-section-heading">
                  <span className="discovery-section-title">Repositories</span>
                  <span className="tag">{filteredRepos.length}</span>
                </div>
              ) : null}
              <ul className="repo-list">
                {filteredRepos.map((repo) => (
                  <li key={repo.path}>
                    <button
                      className="repo-button"
                      onClick={() => {
                        onSelectRepo(repo.path)
                      }}
                      type="button"
                    >
                      <RepoSnapshotCard repo={repo} selected={repo.path === selectedPath} />
                    </button>
                  </li>
                ))}
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
          <p>
            Try clearing the search or switching between archived and non-archived items.
          </p>
        </div>
      )}
    </SectionCard>
  )
}
