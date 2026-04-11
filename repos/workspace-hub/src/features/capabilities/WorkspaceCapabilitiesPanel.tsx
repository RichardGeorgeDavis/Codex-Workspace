import { useDeferredValue, useState } from 'react'

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
  onSelectCapability: (capabilityId: string) => void
  selectedCapabilityId: string | null
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
  onSelectCapability: (capabilityId: string) => void
  selected: boolean
}

function CapabilityCard({
  actionPendingKey,
  capability,
  onAction,
  onOpenAction,
  onSelectCapability,
  selected,
}: CapabilityCardProps) {
  const pendingPrefix = `capability:${capability.id}:`

  return (
    <article className={`service-card capability-card ${selected ? 'active' : ''}`}>
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
          onClick={() => {
            onSelectCapability(capability.id)
          }}
          type="button"
        >
          {selected ? 'Selected' : 'Inspect'}
        </button>
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
  onSelectCapability,
  selectedCapabilityId,
}: WorkspaceCapabilitiesPanelProps) {
  const [classificationFilter, setClassificationFilter] = useState<
    'all' | 'ability' | 'core-service' | 'reference-only' | 'repo-level-adoption'
  >('all')
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const installableCapabilities = capabilities.filter((capability) => capability.exposeInHub)
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase()
  const filteredCapabilities = installableCapabilities.filter((capability) => {
    if (
      classificationFilter !== 'all' &&
      capability.classification !== classificationFilter
    ) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const haystack = [
      capability.name,
      capability.description,
      capability.category,
      capability.classification,
      capability.id,
      capability.installTarget,
      capability.notes,
      capability.repoUsageNotes,
      capability.sourceUrl,
      capability.updateStrategy,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedSearch)
  })
  const coreServiceCapabilities = filteredCapabilities.filter(
    (capability) => capability.classification === 'core-service',
  )
  const abilityCapabilities = filteredCapabilities.filter(
    (capability) => capability.classification === 'ability',
  )
  const selectedCapability =
    filteredCapabilities.find((capability) => capability.id === selectedCapabilityId)
    ?? installableCapabilities.find((capability) => capability.id === selectedCapabilityId)
    ?? filteredCapabilities[0]
    ?? installableCapabilities[0]
    ?? null
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

      {installableCapabilities.length ? (
        <>
          <div className="repo-toolbar capability-toolbar">
            <label className="field">
              <span>Search capabilities</span>
              <input
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                }}
                placeholder="name, source, notes, install target"
                type="search"
                value={searchTerm}
              />
            </label>

            <label className="field compact">
              <span>Classification</span>
              <select
                onChange={(event) => {
                  setClassificationFilter(
                    event.target.value as
                      | 'all'
                      | 'ability'
                      | 'core-service'
                      | 'reference-only'
                      | 'repo-level-adoption',
                  )
                }}
                value={classificationFilter}
              >
                <option value="all">All installable</option>
                <option value="core-service">Core services</option>
                <option value="ability">Abilities</option>
              </select>
            </label>
          </div>

          {selectedCapability ? (
            <article className="service-card capability-featured-card">
              <div className="service-card-header">
                <div>
                  <strong>{selectedCapability.name}</strong>
                  <p className="service-card-copy">{selectedCapability.description}</p>
                </div>

                <span className="repo-card-tags">
                  <span className="tag">{selectedCapability.id}</span>
                  <span className="tag">{selectedCapability.classification}</span>
                  <span
                    className={`status-pill ${selectedCapability.enabled ? 'ready' : 'stopped'}`}
                  >
                    {selectedCapability.enabled ? 'enabled' : 'disabled'}
                  </span>
                  <span
                    className={`status-pill ${selectedCapability.installed ? 'ready' : 'unknown'}`}
                  >
                    {selectedCapability.installed ? 'installed' : 'not installed'}
                  </span>
                </span>
              </div>

              <div className="service-grid">
                <div>
                  <span className="service-label">Install target</span>
                  <code>{selectedCapability.installTarget}</code>
                </div>
                <div>
                  <span className="service-label">Category</span>
                  <code>{selectedCapability.category}</code>
                </div>
                <div>
                  <span className="service-label">Source</span>
                  <code>{selectedCapability.sourceUrl}</code>
                </div>
                <div>
                  <span className="service-label">Last state change</span>
                  <code>
                    {selectedCapability.updatedAt
                      ? formatGeneratedAt(selectedCapability.updatedAt)
                      : 'default state'}
                  </code>
                </div>
              </div>

              {selectedCapability.repoUsageNotes ? (
                <p className="section-copy capability-copy">
                  {selectedCapability.repoUsageNotes}
                </p>
              ) : null}

              {selectedCapability.notes ? (
                <p className="section-copy capability-copy">{selectedCapability.notes}</p>
              ) : null}
            </article>
          ) : null}
        </>
      ) : null}

      {loading && !installableCapabilities.length ? (
        <p className="loading-copy">Loading capability lifecycle state...</p>
      ) : filteredCapabilities.length ? (
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
                    onSelectCapability={onSelectCapability}
                    selected={selectedCapability?.id === capability.id}
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
                    onSelectCapability={onSelectCapability}
                    selected={selectedCapability?.id === capability.id}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <strong>
            {installableCapabilities.length
              ? 'No capabilities match the current filter.'
              : 'No installable capabilities are configured.'}
          </strong>
          <p>
            {installableCapabilities.length
              ? 'Try clearing the capability search or switching classification.'
              : 'Add installable entries to `tools/manifests/workspace-capabilities.json` to surface them here.'}
          </p>
        </div>
      )}
    </SectionCard>
  )
}
