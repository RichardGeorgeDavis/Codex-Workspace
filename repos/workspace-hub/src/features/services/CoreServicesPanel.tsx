import { SectionCard } from '../../components/SectionCard.tsx'
import type { WorkspaceCoreService } from '../../types/workspace.ts'

type CoreServicesPanelProps = {
  actionPendingKey: string | null
  loading: boolean
  onInstallAction: (serviceId: string) => Promise<void>
  onOpenAction: (
    serviceId: string,
    target: 'cache' | 'docs' | 'exports' | 'readme' | 'repo' | 'storage' | 'terminal',
  ) => Promise<void>
  onOpenServiceWorkspace: (serviceId: string) => void
  onRuntimeAction: (
    serviceId: string,
    action: 'restart' | 'start' | 'stop',
  ) => Promise<void>
  onSelectService: (serviceId: string) => void
  onSyncAction: (serviceId: string) => Promise<void>
  selectedServiceId: string | null
  services: WorkspaceCoreService[]
}

function ServiceStatusCard({
  actionPendingKey,
  onInstallAction,
  onOpenAction,
  onOpenServiceWorkspace,
  onRuntimeAction,
  onSelectService,
  onSyncAction,
  selected,
  service,
}: {
  actionPendingKey: string | null
  onInstallAction: (serviceId: string) => Promise<void>
  onOpenAction: (
    serviceId: string,
    target: 'cache' | 'docs' | 'exports' | 'readme' | 'repo' | 'storage' | 'terminal',
  ) => Promise<void>
  onOpenServiceWorkspace: (serviceId: string) => void
  onRuntimeAction: (
    serviceId: string,
    action: 'restart' | 'start' | 'stop',
  ) => Promise<void>
  onSelectService: (serviceId: string) => void
  onSyncAction: (serviceId: string) => Promise<void>
  selected: boolean
  service: WorkspaceCoreService
}) {
  const pendingPrefix = `service:${service.id}:`

  return (
    <article className={`service-card ${selected ? 'active' : ''}`}>
      <div className="service-card-header">
        <div>
          <strong>{service.name}</strong>
          <p className="service-card-copy">{service.description}</p>
        </div>

        <span className="repo-card-tags">
          <span className={`status-pill ${service.runtime.status}`}>{service.runtime.status}</span>
          <span className={`status-pill ${service.install.status}`}>{service.install.status}</span>
          <span className="tag">{service.category}</span>
        </span>
      </div>

      <div className="service-grid">
        <div>
          <span className="service-label">Version</span>
          <code>{service.version ?? 'unknown'}</code>
        </div>
        <div>
          <span className="service-label">Branch</span>
          <code>{service.branch ?? 'missing'}</code>
        </div>
        <div>
          <span className="service-label">User</span>
          <code>{service.user}</code>
        </div>
        <div>
          <span className="service-label">Venv</span>
          <code>{service.venvReady ? 'ready' : 'missing'}</code>
        </div>
      </div>

      <ul className="settings-list service-paths">
        <li className="settings-item">
          <span>Repo</span>
          <code>{service.repoRelativePath}</code>
        </li>
        <li className="settings-item">
          <span>Shared state</span>
          <code>{service.sharedRoot}</code>
        </li>
        <li className="settings-item">
          <span>Config</span>
          <code>{service.configPath}</code>
        </li>
        <li className="settings-item">
          <span>Cache</span>
          <code>{service.cacheRoot}</code>
        </li>
      </ul>

      <div className="service-actions">
        <button
          className="action-button"
          onClick={() => {
            onSelectService(service.id)
            onOpenServiceWorkspace(service.id)
          }}
          type="button"
        >
          {service.id === 'mempalace' ? 'Open memory workspace' : 'View details'}
        </button>
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
      </div>
    </article>
  )
}

export function CoreServicesPanel({
  actionPendingKey,
  loading,
  onInstallAction,
  onOpenAction,
  onOpenServiceWorkspace,
  onRuntimeAction,
  onSelectService,
  onSyncAction,
  selectedServiceId,
  services,
}: CoreServicesPanelProps) {
  return (
    <SectionCard
      body="Workspace-level services live outside the normal repo inventory because they support how the workspace itself operates."
      className="reveal delayed"
      collapsible
      defaultOpen={false}
      eyebrow="Core Services"
      title="Core services"
    >
      {loading && !services.length ? (
        <p className="loading-copy">Loading workspace services...</p>
      ) : services.length ? (
        <div className="service-list">
          {services.map((service) => (
            <ServiceStatusCard
              key={service.id}
              actionPendingKey={actionPendingKey}
              onInstallAction={onInstallAction}
              onOpenAction={onOpenAction}
              onOpenServiceWorkspace={onOpenServiceWorkspace}
              onRuntimeAction={onRuntimeAction}
              onSelectService={onSelectService}
              onSyncAction={onSyncAction}
              selected={selectedServiceId === service.id}
              service={service}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No core services are configured.</strong>
          <p>Add a service to `tools/manifests/core-services.json` to surface it here.</p>
        </div>
      )}
    </SectionCard>
  )
}
