import { useState } from 'react'

import { SectionCard } from '../../components/SectionCard.tsx'
import type {
  WorkspaceCoreService,
  WorkspaceCoreServiceCommandId,
  WorkspaceCoreServiceTargetContext,
  WorkspaceCoreServiceTargetKind,
  WorkspaceRepo,
} from '../../types/workspace.ts'

type MempalaceWorkspacePageProps = {
  actionError: string | null
  actionPendingKey: string | null
  commandOutput: string | null
  context: WorkspaceCoreServiceTargetContext | null
  loading: boolean
  onInstallAction: (serviceId: string) => Promise<void>
  onOpenAction: (
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
  ) => Promise<void>
  onReturnToDashboard: () => void
  onRunCommand: (commandId: WorkspaceCoreServiceCommandId) => Promise<void>
  onSearchAction: (query: string) => Promise<void>
  onTargetKindChange: (value: WorkspaceCoreServiceTargetKind) => void
  onTargetRepoChange: (value: string) => void
  service: WorkspaceCoreService
  selectedRepoRelativePath: string | null
  selectedTargetKind: WorkspaceCoreServiceTargetKind
  repos: WorkspaceRepo[]
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function MempalaceWorkspacePage({
  actionError,
  actionPendingKey,
  commandOutput,
  context,
  loading,
  onInstallAction,
  onOpenAction,
  onReturnToDashboard,
  onRunCommand,
  onSearchAction,
  onTargetKindChange,
  onTargetRepoChange,
  repos,
  selectedRepoRelativePath,
  selectedTargetKind,
  service,
}: MempalaceWorkspacePageProps) {
  const pendingPrefix = `service:${service.id}:`
  const [searchQuery, setSearchQuery] = useState(service.lastSearchQuery ?? '')

  return (
    <main className="memory-workspace-page">
      <section className="memory-page-hero reveal">
        <div className="memory-page-copy">
          <p className="eyebrow">Workspace Memory</p>
          <h2>{service.name}</h2>
          <p className="hero-text">
            This page is the workspace-level memory surface. It tracks shared memory state,
            selected repo or docs targets, and safe wrapper commands for capture, export, wake-up,
            and service maintenance.
          </p>
        </div>

        <div className="memory-page-actions">
          <button className="action-button" onClick={onReturnToDashboard} type="button">
            Back to dashboard
          </button>
          <button
            className="primary-button"
            disabled={actionPendingKey === `${pendingPrefix}install`}
            onClick={() => {
              void onInstallAction(service.id)
            }}
            type="button"
          >
            Install or repair
          </button>
        </div>
      </section>

      <div className="memory-page-grid">
        <SectionCard
          body="MemPalace is a workspace service, not a repo runtime. Canonical docs stay in tracked files; MemPalace supports retrieval and operator memory."
          className="reveal"
          eyebrow="Service State"
          title="Workspace memory service"
        >
          <div className="service-grid">
            <div>
              <span className="service-label">Runtime</span>
              <span className={`status-pill ${service.runtime.status}`}>{service.runtime.status}</span>
            </div>
            <div>
              <span className="service-label">Install</span>
              <span className={`status-pill ${service.install.status}`}>{service.install.status}</span>
            </div>
            <div>
              <span className="service-label">Version</span>
              <code>{service.version ?? 'unknown'}</code>
            </div>
            <div>
              <span className="service-label">Branch</span>
              <code>{service.branch ?? 'missing'}</code>
            </div>
          </div>

          <dl className="details-list">
            <div className="details-row stacked">
              <dt>Repo path</dt>
              <dd>{service.repoPath}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Shared root</dt>
              <dd>{service.sharedRoot}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Exports root</dt>
              <dd>{service.exportsRoot}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Cache root</dt>
              <dd>{service.cacheRoot}</dd>
            </div>
            <div className="details-row">
              <dt>Last export</dt>
              <dd>{formatTimestamp(service.lastCodexExportAt)}</dd>
            </div>
            <div className="details-row">
              <dt>Last ingest</dt>
              <dd>{formatTimestamp(service.lastIngestAt)}</dd>
            </div>
            <div className="details-row">
              <dt>Last save</dt>
              <dd>{formatTimestamp(service.lastSaveAt)}</dd>
            </div>
            <div className="details-row">
              <dt>Last wake-up</dt>
              <dd>{formatTimestamp(service.lastWakeUpAt)}</dd>
            </div>
            <div className="details-row">
              <dt>Last search</dt>
              <dd>{formatTimestamp(service.lastSearchAt)}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Last search query</dt>
              <dd>{service.lastSearchQuery ?? 'No search query recorded yet.'}</dd>
            </div>
            <div className="details-row">
              <dt>Last sync</dt>
              <dd>{formatTimestamp(service.lastSyncAt)}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Origin</dt>
              <dd>{service.originUrl ?? 'No origin remote configured'}</dd>
            </div>
            <div className="details-row stacked">
              <dt>Upstream</dt>
              <dd>{service.upstreamUrl ?? 'No upstream remote configured'}</dd>
            </div>
          </dl>

          <div className="service-actions">
            <button
              className="action-button"
              onClick={() => {
                void onOpenAction(service.id, 'repo')
              }}
              type="button"
            >
              Open repo
            </button>
            <button
              className="action-button"
              onClick={() => {
                void onOpenAction(service.id, 'docs')
              }}
              type="button"
            >
              Open docs
            </button>
            <button
              className="action-button"
              onClick={() => {
                void onOpenAction(service.id, 'storage')
              }}
              type="button"
            >
              Open storage
            </button>
            <button
              className="action-button"
              onClick={() => {
                void onOpenAction(service.id, 'exports')
              }}
              type="button"
            >
              Open exports
            </button>
            <button
              className="action-button"
              onClick={() => {
                void onOpenAction(service.id, 'cache')
              }}
              type="button"
            >
              Open cache
            </button>
          </div>
        </SectionCard>

        <SectionCard
          body="Select the workspace-docs target, the current repo, or any repo under repos/. The memory page owns its own target context and does not silently depend on the main dashboard selection unless you choose current repo."
          className="reveal delayed"
          eyebrow="Target Context"
          title="Selected memory target"
        >
          <div className="memory-target-controls">
            <label className="memory-field">
              <span>Target type</span>
              <select
                onChange={(event) => {
                  onTargetKindChange(event.target.value as WorkspaceCoreServiceTargetKind)
                }}
                value={selectedTargetKind}
              >
                <option value="workspace-docs">Workspace docs</option>
                <option value="current-repo">Current repo</option>
                <option value="repo">Chosen repo</option>
              </select>
            </label>

            {selectedTargetKind === 'repo' ? (
              <label className="memory-field">
                <span>Repo target</span>
                <select
                  onChange={(event) => {
                    onTargetRepoChange(event.target.value)
                  }}
                  value={selectedRepoRelativePath ?? ''}
                >
                  {repos.map((repo) => (
                    <option key={repo.relativePath} value={repo.relativePath}>
                      {repo.name} · {repo.relativePath}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {loading && !context ? <p className="loading-copy">Loading target context...</p> : null}

          {context ? (
            <>
              <dl className="details-list">
                <div className="details-row">
                  <dt>Target label</dt>
                  <dd>{context.targetLabel}</dd>
                </div>
                <div className="details-row">
                  <dt>Metadata</dt>
                  <dd>{context.metadataExists ? 'present' : 'not initialized yet'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Target path</dt>
                  <dd>{context.targetPath ?? 'No target is currently available.'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Metadata path</dt>
                  <dd>{context.metadataPath ?? 'No metadata path for this target.'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Last relevant ingest</dt>
                  <dd>{context.lastRelevantIngestTarget ?? 'No matching ingest target recorded yet.'}</dd>
                </div>
              </dl>

              {context.recommendedActionId ? (
                <div className="memory-recommendation">
                  <strong>{context.recommendedActionLabel}</strong>
                  <button
                    className="action-button"
                    disabled={actionPendingKey === `${pendingPrefix}${context.recommendedActionId}`}
                    onClick={() => {
                      const actionId = context.recommendedActionId
                      if (!actionId) {
                        return
                      }
                      void onRunCommand(actionId)
                    }}
                    type="button"
                  >
                    Run recommended action
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          body="Search runs against the current MemPalace corpus for this workspace user. Use plain-language recall questions, repo names, architecture topics, or thread-specific phrases."
          className="reveal delayed-more"
          eyebrow="Retrieval"
          title="Search workspace memory"
        >
          <form
            className="memory-search-form"
            onSubmit={(event) => {
              event.preventDefault()
              const trimmedQuery = searchQuery.trim()
              if (!trimmedQuery) {
                return
              }
              void onSearchAction(trimmedQuery)
            }}
          >
            <label className="field">
              <span>Search query</span>
              <input
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                }}
                placeholder="what do we already know about workspace memory?"
                type="search"
                value={searchQuery}
              />
            </label>

            <button
              className="primary-button"
              disabled={
                actionPendingKey === `${pendingPrefix}search` || searchQuery.trim().length === 0
              }
              type="submit"
            >
              {actionPendingKey === `${pendingPrefix}search` ? 'Searching...' : 'Run search'}
            </button>
          </form>

          <dl className="details-list">
            <div className="details-row">
              <dt>Latest query</dt>
              <dd>{service.lastSearchQuery ?? 'No search query recorded yet.'}</dd>
            </div>
            <div className="details-row">
              <dt>Latest search time</dt>
              <dd>{formatTimestamp(service.lastSearchAt)}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          body="Graph artifacts are derived views of the selected target. Phase 1 stays sidecar-first, writes rebuildable files under workspace cache, and does not add a second memory engine beside MemPalace."
          className="reveal delayed-more"
          eyebrow="Graph View"
          title="Target-scoped memory graph"
        >
          {context ? (
            <>
              <dl className="details-list">
                <div className="details-row">
                  <dt>Graph status</dt>
                  <dd>{context.graph.lastBuiltAt ? 'built' : 'not built yet'}</dd>
                </div>
                <div className="details-row">
                  <dt>Last built</dt>
                  <dd>{formatTimestamp(context.graph.lastBuiltAt)}</dd>
                </div>
                <div className="details-row">
                  <dt>Node count</dt>
                  <dd>{context.graph.nodeCount ?? 'Not recorded'}</dd>
                </div>
                <div className="details-row">
                  <dt>Edge count</dt>
                  <dd>{context.graph.edgeCount ?? 'Not recorded'}</dd>
                </div>
                <div className="details-row">
                  <dt>Derived edges</dt>
                  <dd>{context.graph.derivedEdgeCount ?? 'Not recorded'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Output directory</dt>
                  <dd>{context.graph.outputDirectory ?? 'Select an available target to build a graph.'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Graph HTML</dt>
                  <dd>{context.graph.artifacts.htmlPath ?? 'Build the graph to create graph.html.'}</dd>
                </div>
                <div className="details-row stacked">
                  <dt>Graph report</dt>
                  <dd>{context.graph.artifacts.reportPath ?? 'Build the graph to create graph-report.md.'}</dd>
                </div>
              </dl>

              {Object.keys(context.graph.nodeTypeCounts).length ? (
                <div className="memory-graph-breakdown">
                  <strong>Node type breakdown</strong>
                  <div className="repo-card-tags">
                    {Object.entries(context.graph.nodeTypeCounts).map(([type, count]) => (
                      <span key={type} className="tag">
                        {type} · {count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {context.graph.reportExcerpt.length ? (
                <div className="memory-command-output memory-graph-report-preview">
                  <strong>Report preview</strong>
                  <pre>{context.graph.reportExcerpt.join('\n')}</pre>
                </div>
              ) : null}

              <div className="service-actions">
                <button
                  className="primary-button"
                  disabled={!context.graph.available || actionPendingKey === `${pendingPrefix}build-graph`}
                  onClick={() => {
                    void onRunCommand('build-graph')
                  }}
                  type="button"
                >
                  {actionPendingKey === `${pendingPrefix}build-graph`
                    ? 'Building graph...'
                    : context.graph.lastBuiltAt
                      ? 'Rebuild graph'
                      : 'Build graph'}
                </button>
                <button
                  className="action-button"
                  disabled={!context.graph.artifacts.htmlPath}
                  onClick={() => {
                    void onOpenAction(service.id, 'graph', context.graph.artifacts.htmlPath)
                  }}
                  type="button"
                >
                  Open graph
                </button>
                <button
                  className="action-button"
                  disabled={!context.graph.outputDirectoryExists || !context.graph.outputDirectory}
                  onClick={() => {
                    void onOpenAction(service.id, 'graph-folder', context.graph.outputDirectory)
                  }}
                  type="button"
                >
                  Open graph folder
                </button>
              </div>
            </>
          ) : (
            <p className="loading-copy">Load a target context to inspect graph status.</p>
          )}
        </SectionCard>

        <SectionCard
          body="Workspace Hub reads the installed MemPalace version directly from the local repo. With 3.1.0, wake-up filtering now suppresses low-signal sources by default and repo mining can opt into explicit exclude globs for generated output."
          className="reveal delayed-more"
          eyebrow="Release Status"
          title="MemPalace 3.1.0 in workspace"
        >
          <ul className="memory-checklist">
            <li>Workspace Hub surfaces the installed MemPalace version from the local package metadata.</li>
            <li>Wake-up now prefers project guidance over dependency metadata by skipping low-signal drawers.</li>
            <li>Repo mining supports explicit `--exclude` patterns for lockfiles and generated output.</li>
            <li>Tracked docs remain canonical; MemPalace is supporting retrieval and long-term operator memory.</li>
            <li>Future phases can add automation for recurring saves and more conversation exporters.</li>
          </ul>
        </SectionCard>

        <SectionCard
          body="These are the workspace-owned wrappers that the page can run safely. The shell command shown on each card is the exact command represented by the UI action."
          className="reveal delayed-more"
          eyebrow="Command Surface"
          title="Safe MemPalace actions"
        >
          {context ? (
            <div className="memory-command-grid">
              {context.commands.map((command) => (
                <article key={command.id} className="memory-command-card">
                  <div className="memory-command-header">
                    <strong>{command.label}</strong>
                    <span className={`status-pill ${command.enabled ? 'running' : 'idle'}`}>
                      {command.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  <p>{command.description}</p>
                  <code>{command.shellCommand}</code>
                  {command.reasonDisabled ? (
                    <p className="memory-command-note">{command.reasonDisabled}</p>
                  ) : null}
                  <button
                    className="action-button"
                    disabled={!command.enabled || actionPendingKey === `${pendingPrefix}${command.id}`}
                    onClick={() => {
                      void onRunCommand(command.id)
                    }}
                    type="button"
                  >
                    Run action
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="loading-copy">Load a target context to view the command surface.</p>
          )}

          {commandOutput ? (
            <div className="memory-command-output">
              <strong>Last command output</strong>
              <pre>{commandOutput}</pre>
            </div>
          ) : null}

          {actionError ? (
            <div className="inline-error" aria-live="polite">
              {actionError}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </main>
  )
}
