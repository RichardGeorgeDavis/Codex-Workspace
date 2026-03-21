import { SectionCard } from '../../components/SectionCard.tsx'
import type { RepoType, WorkspaceRepo } from '../../types/workspace.ts'

type RepoFilterValue = RepoType | 'all' | 'external' | 'runnable'

type RepoSnapshotProps = {
  availableTypes: RepoType[]
  filteredRepos: WorkspaceRepo[]
  loading: boolean
  onFilterChange: (value: RepoFilterValue) => void
  onSearchChange: (value: string) => void
  onSelectRepo: (path: string) => void
  searchTerm: string
  selectedPath: string | null
  selectedFilter: RepoFilterValue
}

type RepoSnapshotCardProps = {
  repo: WorkspaceRepo
  selected: boolean
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

function RepoSnapshotCard({ repo, selected }: RepoSnapshotCardProps) {
  const showDependencyWarning =
    repo.dependencies.state === 'missing' || repo.dependencies.state === 'unknown'
  const recentLabel = formatRecentLabel(repo)

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
        </span>
      </span>
      <span className="repo-card-meta">
        <span>{repo.relativePath}</span>
        <span>{repo.preferredMode}</span>
        <span>{repo.packageManager || 'manual'}</span>
      </span>
      <span className="repo-card-diagnostics">
        <span className="repo-card-branch">git {formatBranchLabel(repo)}</span>
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
        <span>
          {recentLabel
            ? recentLabel
            : repo.runtime.pid
            ? `pid ${repo.runtime.pid}`
            : repo.hasManifest
              ? 'manifest-backed'
              : repo.detectedBy}
        </span>
      </span>
    </span>
  )
}

export function RepoSnapshot({
  availableTypes,
  filteredRepos,
  loading,
  onFilterChange,
  onSearchChange,
  onSelectRepo,
  searchTerm,
  selectedPath,
  selectedFilter,
}: RepoSnapshotProps) {
  return (
    <SectionCard
      body="Sibling repos are now being discovered and classified. Filtering here only affects the list view; it does not modify anything on disk."
      className="wide reveal"
      eyebrow="Repo Discovery"
      title="Discovered repositories"
    >
      <div className="repo-toolbar">
        <label className="field">
          <span>Search</span>
          <input
            onChange={(event) => {
              onSearchChange(event.target.value)
            }}
            placeholder="name, path, type, tag"
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
            <option value="all">All repos</option>
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

      {loading && !filteredRepos.length ? (
        <p className="loading-copy">Scanning workspace roots...</p>
      ) : filteredRepos.length ? (
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
      ) : (
        <div className="empty-state">
          <strong>No repos match the current filter.</strong>
          <p>
            Try clearing the search or switching the filter back to all repos.
          </p>
        </div>
      )}
    </SectionCard>
  )
}
