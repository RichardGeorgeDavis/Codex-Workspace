import { SectionCard } from '../../components/SectionCard.tsx'
import type {
  WorkspaceCapabilitiesSnapshot,
  WorkspaceCapability,
  WorkspaceCapabilityActionId,
} from '../../types/workspace.ts'

type WorkspaceCapabilitiesPanelProps = {
  actionPendingKey: string | null
  capabilities: WorkspaceCapability[]
  snapshot: WorkspaceCapabilitiesSnapshot | null
  loading: boolean
  onAction: (capabilityId: string, action: WorkspaceCapabilityActionId) => Promise<void>
  onOpenAction: (
    capabilityId: string,
    target: 'docs' | 'readme' | 'repo',
  ) => Promise<void>
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

type CapabilityCardProps = {
  actionPendingKey: string | null
  capability: WorkspaceCapability
  onAction: (capabilityId: string, action: WorkspaceCapabilityActionId) => Promise<void>
  onOpenAction: (
    capabilityId: string,
    target: 'docs' | 'readme' | 'repo',
  ) => Promise<void>
}

function CapabilityCard({
  actionPendingKey,
  capability,
  onAction,
  onOpenAction,
}: CapabilityCardProps) {
  const pendingPrefix = `capability:${capability.id}:`

  return (
    <article className="service-card capability-card">
      <div className="service-card-header">
        <div>
          <strong>{capability.name}</strong>
          <p className="service-card-copy">{capability.description}</p>
        </div>

        <span className="repo-card-tags">
          <span className="tag">{capability.classification}</span>
          <span className={`status-pill ${capability.enabled ? 'ready' : 'stopped'}`}>
            {capability.enabled ? 'enabled' : 'disabled'}
          </span>
          <span className={`status-pill ${capability.installed ? 'ready' : 'unknown'}`}>
            {capability.installed ? 'installed' : 'not installed'}
          </span>
        </span>
      </div>

      <div className="service-grid">
        <div>
          <span className="service-label">Install method</span>
          <code>{capability.installMethod}</code>
        </div>
        <div>
          <span className="service-label">Update strategy</span>
          <code>{capability.updateStrategy}</code>
        </div>
        <div>
          <span className="service-label">Category</span>
          <code>{capability.category}</code>
        </div>
        <div>
          <span className="service-label">Last state change</span>
          <code>{capability.updatedAt ? formatGeneratedAt(capability.updatedAt) : 'default state'}</code>
        </div>
      </div>

      <ul className="settings-list service-paths">
        <li className="settings-item">
          <span>Target</span>
          <code>{capability.installTarget}</code>
        </li>
        <li className="settings-item">
          <span>Source</span>
          <code>{capability.sourceUrl}</code>
        </li>
      </ul>

      {capability.repoUsageNotes ? (
        <p className="section-copy capability-copy">{capability.repoUsageNotes}</p>
      ) : null}

      {capability.uninstallPolicy ? (
        <p className="section-copy capability-copy">{capability.uninstallPolicy}</p>
      ) : null}

      <div className="service-actions">
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}install`}
          onClick={() => {
            void onAction(capability.id, 'install')
          }}
          type="button"
        >
          Install
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}update` || !capability.installed}
          onClick={() => {
            void onAction(capability.id, 'update')
          }}
          type="button"
        >
          Update
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}enable` || capability.enabled}
          onClick={() => {
            void onAction(capability.id, 'enable')
          }}
          type="button"
        >
          Enable
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}disable` || !capability.enabled}
          onClick={() => {
            void onAction(capability.id, 'disable')
          }}
          type="button"
        >
          Disable
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === `${pendingPrefix}uninstall` || !capability.installed}
          onClick={() => {
            void onAction(capability.id, 'uninstall')
          }}
          type="button"
        >
          Uninstall
        </button>
        <button
          className="action-button"
          disabled={!capability.installed}
          onClick={() => {
            void onOpenAction(capability.id, 'repo')
          }}
          type="button"
        >
          Open repo
        </button>
        <button
          className="action-button"
          disabled={!capability.docsPath}
          onClick={() => {
            void onOpenAction(capability.id, 'docs')
          }}
          type="button"
        >
          Open docs
        </button>
        <button
          className="action-button"
          disabled={!capability.readmePath}
          onClick={() => {
            void onOpenAction(capability.id, 'readme')
          }}
          type="button"
        >
          Open readme
        </button>
      </div>
    </article>
  )
}

export function WorkspaceCapabilitiesPanel({
  actionPendingKey,
  capabilities,
  snapshot,
  loading,
  onAction,
  onOpenAction,
}: WorkspaceCapabilitiesPanelProps) {
  const installableCapabilities = capabilities.filter((capability) => capability.exposeInHub)
  const coreServiceCapabilities = installableCapabilities.filter(
    (capability) => capability.classification === 'core-service',
  )
  const abilityCapabilities = installableCapabilities.filter(
    (capability) => capability.classification === 'ability',
  )
  const snapshotStats = snapshot?.stats ?? null

  return (
    <SectionCard
      body="Installable workspace abilities and core services share one lifecycle registry, but they stay separate from normal repo updates."
      className="reveal delayed"
      collapsible
      defaultOpen={false}
      eyebrow="Capabilities"
      title="Workspace capabilities"
    >
      {snapshotStats ? (
        <div className="capability-status-grid">
          <div className="status-card capability-status-card">
            <small>Installable</small>
            <strong>{snapshotStats.installable}</strong>
          </div>
          <div className="status-card capability-status-card">
            <small>Installed locally</small>
            <strong>{snapshotStats.installed}</strong>
          </div>
          <div className="status-card capability-status-card">
            <small>Enabled</small>
            <strong>{snapshotStats.enabled}</strong>
          </div>
          <div className="status-card capability-status-card">
            <small>Reference-only</small>
            <strong>{snapshotStats.referenceOnly}</strong>
          </div>
        </div>
      ) : null}

      {snapshot?.generatedAt ? (
        <p className="section-copy capability-copy">
          Read-only capability snapshot updated {formatGeneratedAt(snapshot.generatedAt)}.
        </p>
      ) : null}

      {loading && !installableCapabilities.length ? (
        <p className="loading-copy">Loading capability lifecycle state...</p>
      ) : installableCapabilities.length ? (
        <div className="capability-groups">
          {coreServiceCapabilities.length ? (
            <div className="discovery-group">
              <div className="discovery-section-heading">
                <span className="discovery-section-title">Core-service lifecycle</span>
                <span className="tag">{coreServiceCapabilities.length}</span>
              </div>
              <div className="service-list">
                {coreServiceCapabilities.map((capability) => (
                  <CapabilityCard
                    key={capability.id}
                    actionPendingKey={actionPendingKey}
                    capability={capability}
                    onAction={onAction}
                    onOpenAction={onOpenAction}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {abilityCapabilities.length ? (
            <div className="discovery-group">
              <div className="discovery-section-heading">
                <span className="discovery-section-title">Abilities</span>
                <span className="tag">{abilityCapabilities.length}</span>
              </div>
              <div className="service-list">
                {abilityCapabilities.map((capability) => (
                  <CapabilityCard
                    key={capability.id}
                    actionPendingKey={actionPendingKey}
                    capability={capability}
                    onAction={onAction}
                    onOpenAction={onOpenAction}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No installable capabilities are configured.</strong>
          <p>Add installable entries to `tools/manifests/workspace-capabilities.json` to surface them here.</p>
        </div>
      )}
    </SectionCard>
  )
}
