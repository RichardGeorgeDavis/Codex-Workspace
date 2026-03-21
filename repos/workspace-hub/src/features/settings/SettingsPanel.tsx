import { SectionCard } from '../../components/SectionCard.tsx'
import type { WorkspaceSummary } from '../../types/workspace.ts'

type SettingsPanelProps = {
  loading: boolean
  summary: WorkspaceSummary | null
}

export function SettingsPanel({ loading, summary }: SettingsPanelProps) {
  return (
    <SectionCard
      body="These settings are derived from the handover pack and the current workspace layout. They keep the Hub aligned with the broader local setup."
      className="tall reveal delayed"
      collapsible
      defaultOpen={false}
      eyebrow="Runtime Defaults"
      title="Workspace configuration"
    >
      {loading && !summary ? (
        <p className="loading-copy">Loading local runtime settings...</p>
      ) : (
        <ul className="settings-list">
          <li className="settings-item">
            <span>Manifest path</span>
            <code>{summary?.runtimeDefaults.manifestPath}</code>
          </li>
          <li className="settings-item">
            <span>Default preview mode</span>
            <code>{summary?.runtimeDefaults.previewMode}</code>
          </li>
          <li className="settings-item">
            <span>WordPress fallback mode</span>
            <code>{summary?.runtimeDefaults.externalWordPressMode}</code>
          </li>
          <li className="settings-item">
            <span>Frontend URL</span>
            <code>{summary?.urls.web}</code>
          </li>
          <li className="settings-item">
            <span>API URL</span>
            <code>{summary?.urls.apiBase}</code>
          </li>
          <li className="settings-item">
            <span>Metadata folder</span>
            <code>{summary?.dataRoot}</code>
          </li>
          <li className="settings-item">
            <span>Top-level entries</span>
            <code>{summary?.stats.topLevelEntries}</code>
          </li>
          <li className="settings-item">
            <span>Cache buckets</span>
            <code>{summary?.stats.cacheBuckets}</code>
          </li>
          <li className="settings-item">
            <span>Handover docs</span>
            <code>{summary?.stats.handoverDocs}</code>
          </li>
        </ul>
      )}
    </SectionCard>
  )
}
