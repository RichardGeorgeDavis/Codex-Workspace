import { SectionCard } from '../../components/SectionCard.tsx'
import type { WorkspaceCoreService } from '../../types/workspace.ts'

type CoreServiceDetailsProps = {
  actionError: string | null
  actionPendingKey: string | null
  onInstallAction: (serviceId: string) => Promise<void>
  onOpenAction: (
    serviceId: string,
    target: 'cache' | 'docs' | 'exports' | 'readme' | 'repo' | 'storage' | 'terminal',
  ) => Promise<void>
  onRuntimeAction: (
    serviceId: string,
    action: 'restart' | 'start' | 'stop',
  ) => Promise<void>
  onSyncAction: (serviceId: string) => Promise<void>
  service: WorkspaceCoreService | null
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

export function CoreServiceDetails({
  actionError,
  actionPendingKey,
  onInstallAction,
  onOpenAction,
  onRuntimeAction,
  onSyncAction,
  service,
}: CoreServiceDetailsProps) {
  if (!service) {
    return (
      <SectionCard
        body="Select a core service to inspect its runtime, storage, and maintenance state."
        className="reveal delayed"
        collapsible
        defaultOpen
        eyebrow="Service Detail"
        title="Core service detail"
      >
        <div className="empty-state">
          <strong>No core service is selected.</strong>
          <p>The service panel will surface details here once a service is chosen.</p>
        </div>
      </SectionCard>
    )
  }

  const pendingPrefix = `service:${service.id}:`

  return (
    <SectionCard
      body="Core services sit outside the normal repo inventory because they support how the workspace itself behaves."
      className="reveal delayed"
      collapsible
      defaultOpen
      eyebrow="Service Detail"
      title={service.name}
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

      <div className="service-actions">
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}install`}
          onClick={() => {
            void onInstallAction(service.id)
          }}
          type="button"
        >
          Install
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}start`}
          onClick={() => {
            void onRuntimeAction(service.id, 'start')
          }}
          type="button"
        >
          Start
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}restart`}
          onClick={() => {
            void onRuntimeAction(service.id, 'restart')
          }}
          type="button"
        >
          Restart
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}stop`}
          onClick={() => {
            void onRuntimeAction(service.id, 'stop')
          }}
          type="button"
        >
          Stop
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}sync`}
          onClick={() => {
            void onSyncAction(service.id)
          }}
          type="button"
        >
          Sync
        </button>
      </div>

      {actionError ? (
        <div className="inline-error" aria-live="polite">
          {actionError}
        </div>
      ) : null}

      <dl className="details-list">
        <div className="details-row">
          <dt>Service id</dt>
          <dd>{service.id}</dd>
        </div>
        <div className="details-row">
          <dt>User</dt>
          <dd>{service.user}</dd>
        </div>
        <div className="details-row">
          <dt>Last command</dt>
          <dd>
            {service.lastCommandKind
              ? `${service.lastCommandKind} at ${formatTimestamp(service.lastCommandAt)}`
              : 'Not recorded'}
          </dd>
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
          <dt>Last search</dt>
          <dd>{formatTimestamp(service.lastSearchAt)}</dd>
        </div>
        <div className="details-row">
          <dt>Last sync</dt>
          <dd>{formatTimestamp(service.lastSyncAt)}</dd>
        </div>
        <div className="details-row">
          <dt>Last wake-up</dt>
          <dd>{formatTimestamp(service.lastWakeUpAt)}</dd>
        </div>
        <div className="details-row">
          <dt>Last runtime start</dt>
          <dd>{formatTimestamp(service.lastRuntimeStartAt)}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Last command target</dt>
          <dd>{service.lastCommandTarget ?? 'No recorded target'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Last export target</dt>
          <dd>{service.lastCodexExportTarget ?? 'No recorded export target'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Last ingest target</dt>
          <dd>{service.lastIngestTarget ?? 'No recorded target'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Last save target</dt>
          <dd>{service.lastSaveTarget ?? 'No recorded target'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Last search query</dt>
          <dd>{service.lastSearchQuery ?? 'No recorded query'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Repo path</dt>
          <dd>{service.repoPath}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Shared root</dt>
          <dd>{service.sharedRoot}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Config path</dt>
          <dd>{service.configPath}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Cache root</dt>
          <dd>{service.cacheRoot}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Exports root</dt>
          <dd>{service.exportsRoot}</dd>
        </div>
        <div className="details-row stacked">
          <dt>State path</dt>
          <dd>{service.statePath}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Origin</dt>
          <dd>{service.originUrl ?? 'No origin remote configured'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Upstream</dt>
          <dd>{service.upstreamUrl ?? 'No upstream remote configured'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Updated</dt>
          <dd>{formatTimestamp(service.updatedAt)}</dd>
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
            void onOpenAction(service.id, 'readme')
          }}
          type="button"
        >
          Open readme
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
        <button
          className="action-button"
          onClick={() => {
            void onOpenAction(service.id, 'terminal')
          }}
          type="button"
        >
          Open terminal
        </button>
      </div>
    </SectionCard>
  )
}
