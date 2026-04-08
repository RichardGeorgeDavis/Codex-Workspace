import { SectionCard } from '../../components/SectionCard.tsx'
import type { WorkspaceSummary } from '../../types/workspace.ts'
import type { RepoLayoutMode } from '../layout/repoLayout.ts'

type SettingsPanelProps = {
  loading: boolean
  repoLayoutMode: RepoLayoutMode
  summary: WorkspaceSummary | null
}

function formatCommandValue(
  command: WorkspaceSummary['agentEnvironment']['codex'],
) {
  if (!command.available) {
    return 'missing'
  }

  if (command.path && command.version) {
    return `${command.path} (${command.version})`
  }

  return command.path ?? 'available'
}

export function SettingsPanel({
  loading,
  repoLayoutMode,
  summary,
}: SettingsPanelProps) {
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
        <>
          <div className="settings-subsection">
            <h3 className="settings-group-title">View defaults</h3>
            <p className="section-copy">
              Appearance owns the repo layout toggle. This section reflects the currently active discovery layout and workspace capability counts.
            </p>
            <ul className="settings-list">
              <li className="settings-item">
                <span>Current repo layout</span>
                <code>{repoLayoutMode}</code>
              </li>
              <li className="settings-item">
                <span>Installed abilities</span>
                <code>{summary?.stats.installedAbilities ?? 0}</code>
              </li>
              <li className="settings-item">
                <span>Enabled abilities</span>
                <code>{summary?.stats.enabledAbilities ?? 0}</code>
              </li>
              <li className="settings-item">
                <span>Reference-only sources</span>
                <code>{summary?.stats.referenceCapabilities ?? 0}</code>
              </li>
              <li className="settings-item">
                <span>Capability lifecycle</span>
                <code>tools/scripts/manage-workspace-capabilities.sh</code>
              </li>
            </ul>
          </div>

          <div className="settings-subsection">
            <h3 className="settings-group-title">Runtime defaults</h3>
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
                <span>Archive files</span>
                <code>{summary?.stats.archiveFiles}</code>
              </li>
              <li className="settings-item">
                <span>Cache buckets</span>
                <code>{summary?.stats.cacheBuckets}</code>
              </li>
              <li className="settings-item">
                <span>Core services</span>
                <code>{summary?.stats.coreServices}</code>
              </li>
              <li className="settings-item">
                <span>Tracked abilities</span>
                <code>{summary?.stats.abilities}</code>
              </li>
              <li className="settings-item">
                <span>Handover docs</span>
                <code>{summary?.stats.handoverDocs}</code>
              </li>
            </ul>
          </div>

          <div className="settings-subsection">
            <h3 className="settings-group-title">Agent environment</h3>
            <p className="section-copy">
              {summary?.agentEnvironment.referencePolicy}
            </p>
            <ul className="settings-list">
              <li className="settings-item">
                <span>Codex</span>
                <code>{summary ? formatCommandValue(summary.agentEnvironment.codex) : 'Loading...'}</code>
              </li>
              <li className="settings-item">
                <span>OMX</span>
                <code>{summary ? formatCommandValue(summary.agentEnvironment.omx) : 'Loading...'}</code>
              </li>
              <li className="settings-item">
                <span>OpenCode</span>
                <code>{summary ? formatCommandValue(summary.agentEnvironment.opencode) : 'Loading...'}</code>
              </li>
              <li className="settings-item">
                <span>Bun</span>
                <code>{summary ? formatCommandValue(summary.agentEnvironment.bun) : 'Loading...'}</code>
              </li>
              <li className="settings-item">
                <span>Shared skills</span>
                <code>{summary?.agentEnvironment.sharedSkillsCount}</code>
              </li>
              <li className="settings-item">
                <span>Shared skills path</span>
                <code>{summary?.agentEnvironment.sharedSkillsPath}</code>
              </li>
              <li className="settings-item">
                <span>Codex config</span>
                <code>{summary?.agentEnvironment.userCodexConfigPath ?? 'Not detected'}</code>
              </li>
              <li className="settings-item">
                <span>OpenCode config</span>
                <code>{summary?.agentEnvironment.userOpenCodeConfigPath ?? 'Not detected'}</code>
              </li>
              <li className="settings-item">
                <span>OpenAgent config</span>
                <code>{summary?.agentEnvironment.userOpenAgentConfigPath ?? 'Not detected'}</code>
              </li>
              <li className="settings-item">
                <span>AGENTS templates</span>
                <code>{summary?.agentEnvironment.agentsTemplatePath ?? 'Missing'}</code>
              </li>
              <li className="settings-item">
                <span>Codex templates</span>
                <code>{summary?.agentEnvironment.codexTemplatePath ?? 'Missing'}</code>
              </li>
              <li className="settings-item">
                <span>OpenCode templates</span>
                <code>{summary?.agentEnvironment.opencodeTemplatePath ?? 'Missing'}</code>
              </li>
              <li className="settings-item">
                <span>AGENTS tree script</span>
                <code>{summary?.agentEnvironment.initAgentsTreePath}</code>
              </li>
              <li className="settings-item">
                <span>Agent doctor</span>
                <code>{summary?.agentEnvironment.agentDoctorPath}</code>
              </li>
              <li className="settings-item">
                <span>Agent-enabled repos</span>
                <code>{summary?.stats.agentEnabledRepos}</code>
              </li>
              <li className="settings-item">
                <span>OMX detections</span>
                <code>{summary?.stats.omxDetectedRepos}</code>
              </li>
              <li className="settings-item">
                <span>OpenCode configs</span>
                <code>{summary?.stats.opencodeConfiguredRepos}</code>
              </li>
            </ul>
          </div>
        </>
      )}
    </SectionCard>
  )
}
