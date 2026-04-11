import { type ReactNode, useState } from 'react'

import { SectionCard } from '../../components/SectionCard.tsx'
import {
  collectAgentToolingLabels,
  formatOpenAgentConfigLabel,
} from './agentTooling.ts'
import type {
  RepoIntakeResult,
  RepoAgentPresetId,
  PreviewMode,
  RepoType,
  WorkspaceManifestRecord,
  WorkspaceRepo,
} from '../../types/workspace.ts'

type RepoDetailsProps = {
  actionError: string | null
  actionPendingKey: string | null
  embedded?: boolean
  onApplyAgentPreset: (
    relativePath: string,
    preset: RepoAgentPresetId,
  ) => Promise<void>
  onCoverAction: (relativePath: string) => Promise<void>
  onCopyError: (message: string | null) => void
  onIntakeAction: (relativePath: string) => Promise<void>
  onInstallAction: (relativePath: string) => Promise<void>
  intakeResult?: RepoIntakeResult | null
  loading: boolean
  onOpenAction: (
    relativePath: string,
    target:
      | 'failure-report'
      | 'manifest'
      | 'preview'
      | 'readme'
      | 'repo'
      | 'terminal'
      | 'troubleshooting',
  ) => Promise<void>
  onOpenWorkspacePath: (targetPath: string) => Promise<void>
  onResetMetadata: (relativePath: string) => Promise<void>
  onRuntimeAction: (
    relativePath: string,
    action: 'restart' | 'start' | 'stop',
  ) => Promise<void>
  onSaveMetadata: (
    relativePath: string,
    metadata: {
      buildCommand?: string
      devCommand?: string
      externalUrl?: string
      healthcheckUrl?: string
      notes: string
      pinned: boolean
      preferredMode: PreviewMode
      previewUrl?: string
      tags: string[]
    },
  ) => Promise<void>
  onWriteManifest: (
    relativePath: string,
    manifest: {
      buildCommand?: string
      devCommand?: string
      externalUrl?: string
      healthcheckUrl?: string
      installCommand?: string
      name: string
      notes?: string
      packageManager?: string
      preferredMode: PreviewMode
      previewCommand?: string
      previewUrl?: string
      servbayPath?: string
      servbaySubdomain?: string
      slug: string
      tags?: string[]
      type: RepoType
    },
  ) => Promise<void>
  repo: WorkspaceRepo | null
}

type MetadataDraft = {
  buildCommand: string
  devCommand: string
  externalUrl: string
  healthcheckUrl: string
  notes: string
  pinned: boolean
  preferredMode: PreviewMode
  previewUrl: string
  tags: string
}

type ManifestDraft = {
  buildCommand: string
  devCommand: string
  externalUrl: string
  healthcheckUrl: string
  installCommand: string
  name: string
  notes: string
  packageManager: string
  preferredMode: PreviewMode
  previewCommand: string
  previewUrl: string
  servbayPath: string
  servbaySubdomain: string
  slug: string
  tags: string
  type: RepoType
}

const repoAgentPresetOptions: Array<{
  description: string
  id: RepoAgentPresetId
  label: string
}> = [
  {
    description: 'Root AGENTS.md plus tracked shared skills for official .codex/skills and optional .agents/skills compatibility mirrors.',
    id: 'codex-baseline',
    label: 'Codex baseline',
  },
  {
    description: 'Adds tracked OMX-ready hints in .workspace/agent-stack.json without making OMX mandatory.',
    id: 'omx-ready',
    label: 'OMX ready',
  },
  {
    description: 'Scaffolds .opencode config plus oh-my-openagent project overrides.',
    id: 'opencode',
    label: 'OpenCode',
  },
  {
    description: 'Combines Codex baseline, OMX-ready hints, and OpenCode config.',
    id: 'all-in-one',
    label: 'All-in-one',
  },
]

function buildPendingKey(
  relativePath: string,
  action:
    | 'cover'
    | 'failure-report'
    | 'intake'
    | 'install'
    | 'manifest'
    | 'preview'
    | 'readme'
    | 'repo'
    | 'restart'
    | 'reset-metadata'
    | 'save-metadata'
    | 'start'
    | 'stop'
    | 'terminal'
    | 'troubleshooting'
    | 'write-manifest',
) {
  return `${relativePath}:${action}`
}

function buildAgentPresetPendingKey(
  relativePath: string,
  preset: RepoAgentPresetId,
) {
  return `${relativePath}:agent-preset:${preset}`
}

function buildMetadataDraft(repo: WorkspaceRepo): MetadataDraft {
  return {
    buildCommand: repo.savedMetadata?.buildCommand ?? '',
    devCommand: repo.savedMetadata?.devCommand ?? '',
    externalUrl: repo.savedMetadata?.externalUrl ?? '',
    healthcheckUrl: repo.savedMetadata?.healthcheckUrl ?? '',
    notes: repo.savedMetadata?.notes ?? repo.notes,
    pinned: repo.savedMetadata?.pinned ?? repo.isPinned,
    preferredMode: repo.savedMetadata?.preferredMode ?? repo.preferredMode,
    previewUrl: repo.savedMetadata?.previewUrl ?? '',
    tags: (repo.savedMetadata?.tags ?? repo.tags).join(', '),
  }
}

function normalizeTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function buildManifestDraft(repo: WorkspaceRepo): ManifestDraft {
  return {
    buildCommand: repo.buildCommand ?? '',
    devCommand: repo.devCommand ?? '',
    externalUrl: repo.externalUrl ?? '',
    healthcheckUrl: repo.healthcheckUrl ?? '',
    installCommand: repo.installCommand ?? '',
    name: repo.name,
    notes: repo.notes,
    packageManager: repo.packageManager,
    preferredMode: repo.preferredMode,
    previewCommand: repo.previewCommand ?? '',
    previewUrl: repo.previewUrl ?? '',
    servbayPath: repo.servbayPath ?? '',
    servbaySubdomain: repo.servbaySubdomain ?? '',
    slug: repo.slug,
    tags: repo.tags.join(', '),
    type: repo.type,
  }
}

function buildManifestDraftFromRecord(manifest: WorkspaceManifestRecord): ManifestDraft {
  return {
    buildCommand: manifest.buildCommand ?? '',
    devCommand: manifest.devCommand ?? '',
    externalUrl: manifest.externalUrl ?? '',
    healthcheckUrl: manifest.healthcheckUrl ?? '',
    installCommand: manifest.installCommand ?? '',
    name: manifest.name,
    notes: manifest.notes ?? '',
    packageManager: manifest.packageManager ?? '',
    preferredMode: manifest.preferredMode,
    previewCommand: manifest.previewCommand ?? '',
    previewUrl: manifest.previewUrl ?? '',
    servbayPath: manifest.servbayPath ?? '',
    servbaySubdomain: manifest.servbaySubdomain ?? '',
    slug: manifest.slug,
    tags: (manifest.tags ?? []).join(', '),
    type: manifest.type,
  }
}

function buildManifestPayload(draft: ManifestDraft) {
  const tags = normalizeTags(draft.tags)
  const manifest = {
    name: draft.name.trim(),
    preferredMode: draft.preferredMode,
    slug: draft.slug.trim(),
    type: draft.type,
  } satisfies {
    name: string
    preferredMode: PreviewMode
    slug: string
    type: RepoType
  }

  return {
    ...manifest,
    buildCommand: draft.buildCommand.trim() || undefined,
    devCommand: draft.devCommand.trim() || undefined,
    externalUrl: draft.externalUrl.trim() || undefined,
    healthcheckUrl: draft.healthcheckUrl.trim() || undefined,
    installCommand: draft.installCommand.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    packageManager: draft.packageManager.trim() || undefined,
    previewCommand: draft.previewCommand.trim() || undefined,
    previewUrl: draft.previewUrl.trim() || undefined,
    servbayPath: draft.servbayPath.trim() || undefined,
    servbaySubdomain: draft.servbaySubdomain.trim() || undefined,
    tags: tags.length ? tags : undefined,
  }
}

function formatDependencyStateLabel(state: WorkspaceRepo['dependencies']['state']) {
  switch (state) {
    case 'missing':
      return 'missing'
    case 'not-applicable':
      return 'not applicable'
    case 'ready':
      return 'ready'
    default:
      return 'unknown'
  }
}

function formatRecentValue(value: string | null) {
  if (!value) {
    return 'No recent activity recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatSideLoadStatus(status: NonNullable<WorkspaceRepo['sideLoad']>['status']) {
  switch (status) {
    case 'fresh':
      return 'fresh'
    case 'stale':
      return 'stale'
    default:
      return 'missing'
  }
}

type AccordionSectionProps = {
  badge?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  description?: ReactNode
  title: string
}

function AccordionSection({
  badge,
  children,
  defaultOpen = false,
  description,
  title,
}: AccordionSectionProps) {
  return (
    <details className="details-section details-accordion" open={defaultOpen}>
      <summary className="details-accordion-summary">
        <span className="details-accordion-main">
          <span className="details-accordion-head">
            <span className="details-accordion-title">{title}</span>
            {badge ? <span className="details-accordion-badge">{badge}</span> : null}
          </span>
          {description ? (
            <span className="details-accordion-copy">{description}</span>
          ) : null}
        </span>
        <span className="details-accordion-indicator" aria-hidden="true" />
      </summary>
      <div className="details-accordion-body">{children}</div>
    </details>
  )
}

function buildTroubleshootingTips(repo: WorkspaceRepo) {
  const tips: string[] = []

  if (repo.dependencies.state === 'missing') {
    if (repo.installCommand) {
      tips.push(`Run ${repo.installCommand} before starting the repo again.`)
    } else {
      tips.push('Add an install command in the manifest if this repo needs dependencies.')
    }
  }

  if (repo.dependencies.state === 'unknown') {
    tips.push(
      'Dependency readiness is uncertain. Check the repo README or manifest, then confirm the correct install command.',
    )
  }

  if (
    repo.dependencies.state !== 'ready' &&
    repo.dependencies.installPath &&
    (repo.dependencies.installPath.endsWith('/.venv') || repo.dependencies.installPath.endsWith('\\.venv'))
  ) {
    tips.push('If this Python-style repo expects a local environment, create or refresh `.venv/` before retrying the runtime.')
  }

  if (repo.install.status === 'error') {
    tips.push('The last install failed. Review the install log below before retrying.')
  }

  if (repo.runtime.status === 'error') {
    tips.push('The last runtime command failed. Compare the runtime log with the install state before retrying.')
  }

  if (repo.runtime.status === 'running' && repo.health.state === 'unreachable') {
    tips.push('The repo process is running but not answering yet. Check the expected port, preview URL, and startup log output.')
  }

  if (repo.failureReport) {
    tips.push(
      `A ${repo.failureReport.kind} failure report was recorded at ${formatRecentValue(repo.failureReport.generatedAt)}.`,
    )
  }

  if (repo.preferredMode === 'servbay' && !repo.servbayPath && !repo.servbaySubdomain) {
    tips.push('Mapped-host mode is selected, but no path or subdomain is configured yet. Add one before treating routed preview links as stable.')
  }

  if (repo.preferredMode === 'servbay' && repo.previewUrlSource === 'runtime') {
    tips.push('The current preview URL came from runtime logs. Save an explicit preview URL once the mapped-host route is stable so the Hub does not fall back to transient ports.')
  }

  if (!tips.length) {
    tips.push('No active troubleshooting warnings are present for this repo.')
  }

  return tips
}

export function RepoDetails({
  actionError,
  actionPendingKey,
  embedded = false,
  onApplyAgentPreset,
  onCoverAction,
  onCopyError,
  onIntakeAction,
  onInstallAction,
  intakeResult,
  loading,
  onOpenAction,
  onOpenWorkspacePath,
  onResetMetadata,
  onRuntimeAction,
  onSaveMetadata,
  onWriteManifest,
  repo,
}: RepoDetailsProps) {
  if (embedded) {
    if (!repo) {
      return null
    }

    return (
      <div className="repo-details-embedded">
        <div className="repo-details-embedded-header">
          <span className="repo-card-selection-label">Selection</span>
          <strong>{repo.name} selected.</strong>
          <p>Runtime details, manifests, overrides, and repo actions for the active repository.</p>
        </div>
        <RepoDetailsContent
          key={repo.relativePath}
          actionError={actionError}
          actionPendingKey={actionPendingKey}
          onApplyAgentPreset={onApplyAgentPreset}
          onCoverAction={onCoverAction}
          onCopyError={onCopyError}
          onIntakeAction={onIntakeAction}
          onInstallAction={onInstallAction}
          intakeResult={intakeResult}
          onOpenAction={onOpenAction}
          onOpenWorkspacePath={onOpenWorkspacePath}
          onResetMetadata={onResetMetadata}
          onRuntimeAction={onRuntimeAction}
          onSaveMetadata={onSaveMetadata}
          onWriteManifest={onWriteManifest}
          repo={repo}
        />
      </div>
    )
  }

  return (
    <SectionCard
      body="Runtime details, manifests, overrides, and repo actions for the active repository."
      className="tall reveal delayed"
      eyebrow="Repo Details"
      title={repo?.name ?? 'Repo details'}
    >
      {loading && !repo ? (
        <p className="loading-copy">Waiting for the first repo selection...</p>
      ) : repo ? (
        <RepoDetailsContent
          key={repo.relativePath}
          actionError={actionError}
          actionPendingKey={actionPendingKey}
          onApplyAgentPreset={onApplyAgentPreset}
          onCoverAction={onCoverAction}
          onCopyError={onCopyError}
          onIntakeAction={onIntakeAction}
          onInstallAction={onInstallAction}
          intakeResult={intakeResult}
          onOpenAction={onOpenAction}
          onOpenWorkspacePath={onOpenWorkspacePath}
          onResetMetadata={onResetMetadata}
          onRuntimeAction={onRuntimeAction}
          onSaveMetadata={onSaveMetadata}
          onWriteManifest={onWriteManifest}
          repo={repo}
        />
      ) : (
        <p className="loading-copy">No repo is selected.</p>
      )}
    </SectionCard>
  )
}

type RepoDetailsContentProps = Omit<RepoDetailsProps, 'loading' | 'repo'> & {
  repo: WorkspaceRepo
}

function RepoDetailsContent({
  actionError,
  actionPendingKey,
  onApplyAgentPreset,
  onCoverAction,
  onCopyError,
  onIntakeAction,
  onInstallAction,
  intakeResult,
  onOpenAction,
  onOpenWorkspacePath,
  onResetMetadata,
  onRuntimeAction,
  onSaveMetadata,
  onWriteManifest,
  repo,
}: RepoDetailsContentProps) {
  const [draft, setDraft] = useState<MetadataDraft>(() => buildMetadataDraft(repo))
  const [manifestDraft, setManifestDraft] = useState<ManifestDraft>(() =>
    buildManifestDraft(repo),
  )
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const troubleshootingTips = buildTroubleshootingTips(repo)
  const manifestPayload = buildManifestPayload(manifestDraft)
  const agentToolingLabels = collectAgentToolingLabels(repo.agentTooling)
  const hasAgentTooling = agentToolingLabels.length > 0
  const manifestReady =
    manifestPayload.name.length > 0 && manifestPayload.slug.length > 0
  const hasTroubleshootingAttention =
    repo.dependencies.state === 'missing' ||
    repo.dependencies.state === 'unknown' ||
    repo.install.status === 'error' ||
    repo.runtime.status === 'error'
  const sideLoad = repo.sideLoad
  const sideLoadStatus = sideLoad ? formatSideLoadStatus(sideLoad.status) : null
  const hasMappedHostRouting = Boolean(repo.servbayPath || repo.servbaySubdomain)
  const mappedHostStatus =
    repo.preferredMode !== 'servbay'
      ? 'not using mapped-host mode'
      : hasMappedHostRouting
        ? 'configured'
        : 'needs route'
  const dependencyBadgeTone =
    repo.dependencies.state === 'ready'
      ? 'ready'
      : repo.dependencies.state === 'not-applicable'
        ? 'unknown'
        : repo.dependencies.state
  const mappedHostBadgeTone =
    repo.preferredMode !== 'servbay'
      ? 'unknown'
      : hasMappedHostRouting
        ? 'ready'
        : 'error'

  async function handleCopy(value: string | null, label: string) {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopyMessage(`Copied ${label}.`)
      onCopyError(null)
    } catch (caughtError) {
      setCopyMessage(null)
      onCopyError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to copy ${label}.`,
      )
    }
  }

  return (
    <>
      <div className="action-row">
        <button
          className="action-button"
          disabled={actionPendingKey === buildPendingKey(repo.relativePath, 'repo')}
          onClick={() => {
            void onOpenAction(repo.relativePath, 'repo')
          }}
          type="button"
        >
          Open in Finder
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === buildPendingKey(repo.relativePath, 'terminal')}
          onClick={() => {
            void onOpenAction(repo.relativePath, 'terminal')
          }}
          type="button"
        >
          Open in Terminal
        </button>
        <button
          className="action-button"
          disabled={actionPendingKey === buildPendingKey(repo.relativePath, 'intake')}
          onClick={() => {
            void onIntakeAction(repo.relativePath)
          }}
          type="button"
        >
          Run repo intake
        </button>
        <button
          className="action-button"
          disabled={
            !repo.readmePath ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'readme')
          }
          onClick={() => {
            void onOpenAction(repo.relativePath, 'readme')
          }}
          type="button"
        >
          Open README
        </button>
        <button
          className="action-button"
          disabled={
            !repo.previewUrl ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'cover')
          }
          onClick={() => {
            void onCoverAction(repo.relativePath)
          }}
          type="button"
        >
          Capture cover + update README
        </button>
        <button
          className="action-button"
          disabled={
            !repo.failureReport?.filePath ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'failure-report')
          }
          onClick={() => {
            void onOpenAction(repo.relativePath, 'failure-report')
          }}
          type="button"
        >
          Open failure report
        </button>
        <button
          className="action-button"
          disabled={
            !repo.manifestPath ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'manifest')
          }
          onClick={() => {
            void onOpenAction(repo.relativePath, 'manifest')
          }}
          type="button"
        >
          Open manifest
        </button>
        <button
          className="action-button"
          disabled={
            !repo.previewUrl ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'preview')
          }
          onClick={() => {
            void onOpenAction(repo.relativePath, 'preview')
          }}
          type="button"
        >
          Open preview
        </button>
        <button
          className="action-button"
          disabled={
            actionPendingKey === buildPendingKey(repo.relativePath, 'troubleshooting')
          }
          onClick={() => {
            void onOpenAction(repo.relativePath, 'troubleshooting')
          }}
          type="button"
        >
          Open troubleshooting notes
        </button>
      </div>

      <div className="action-row runtime">
        <button
          className="action-button"
          disabled={
            !repo.installCommand ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'install')
          }
          onClick={() => {
            void onInstallAction(repo.relativePath)
          }}
          type="button"
        >
          Install dependencies
        </button>
        <button
          className="action-button primary"
          disabled={
            !repo.devCommand ||
            repo.runtime.status === 'running' ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'start')
          }
          onClick={() => {
            void onRuntimeAction(repo.relativePath, 'start')
          }}
          type="button"
        >
          Start
        </button>
        <button
          className="action-button"
          disabled={
            repo.runtime.status !== 'running' ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'stop')
          }
          onClick={() => {
            void onRuntimeAction(repo.relativePath, 'stop')
          }}
          type="button"
        >
          Stop
        </button>
        <button
          className="action-button"
          disabled={
            !repo.devCommand ||
            actionPendingKey === buildPendingKey(repo.relativePath, 'restart')
          }
          onClick={() => {
            void onRuntimeAction(repo.relativePath, 'restart')
          }}
          type="button"
        >
          Restart
        </button>
      </div>

      <div className="details-section">
        <div className="section-heading">
          <h3>Overview</h3>
          <span className={`status-pill ${repo.runtime.status}`}>
            {repo.runtime.status}
          </span>
        </div>

        <dl className="details-list overview-list">
          <div className="details-row">
            <dt>Preview URL</dt>
            <dd>
              {repo.previewUrl
                ? `${repo.previewUrl} (${repo.previewUrlSource})`
                : 'No preview URL set'}
            </dd>
          </div>
          <div className="details-row">
            <dt>Health</dt>
            <dd>
              <span className={`status-pill ${repo.health.state}`}>
                {repo.health.state}
              </span>
              {repo.health.url ? ` ${repo.health.url}` : ''}
              {repo.health.httpStatus ? ` (HTTP ${repo.health.httpStatus})` : ''}
            </dd>
          </div>
          <div className="details-row">
            <dt>Dependencies</dt>
            <dd>
              <span className={`status-pill ${dependencyBadgeTone}`}>
                {formatDependencyStateLabel(repo.dependencies.state)}
              </span>
              {` ${repo.dependencies.reason}`}
            </dd>
          </div>
          <div className="details-row">
            <dt>Mapped-host routing</dt>
            <dd>
              <span className={`status-pill ${mappedHostBadgeTone}`}>{mappedHostStatus}</span>
              {repo.preferredMode === 'servbay'
                ? hasMappedHostRouting
                  ? ` ${repo.servbaySubdomain ? `${repo.servbaySubdomain} subdomain` : repo.servbayPath}`
                  : ' Add a mapped-host path or subdomain before relying on this mode.'
                : ' Direct or external preview is currently preferred.'}
            </dd>
          </div>
          <div className="details-row">
            <dt>Diagnostics freshness</dt>
            <dd>
              <span className={`status-pill ${repo.diagnosticsFreshness}`}>
                {repo.diagnosticsFreshness}
              </span>
            </dd>
          </div>
          <div className="details-row">
            <dt>Dev command</dt>
            <dd>{repo.devCommand ?? 'Not inferred yet'}</dd>
          </div>
          <div className="details-row">
            <dt>Agent tooling</dt>
            <dd className="tag-group">
              {hasAgentTooling ? (
                agentToolingLabels.map((label) => (
                  <span key={label} className="tag">
                    {label}
                  </span>
                ))
              ) : 'No repo-local agent tooling detected'}
            </dd>
          </div>
          <div className="details-row">
            <dt>Git</dt>
            <dd>
              <span className={`status-pill ${repo.git.state}`}>{repo.git.state}</span>
              {' '}
              <span className="details-inline-copy">{repo.git.summary}</span>
            </dd>
          </div>
          <div className="details-row">
            <dt>Visibility</dt>
            <dd>
              <span className={`status-pill ${repo.git.visibility}`}>
                {repo.git.visibility === 'local-only' ? 'local only' : repo.git.visibility}
              </span>
              {repo.git.remoteUrl ? ` ${repo.git.remoteUrl}` : ' No remote configured'}
            </dd>
          </div>
          <div className="details-row">
            <dt>Recent</dt>
            <dd>
              {repo.recent.lastActionKind
                ? `${repo.recent.lastActionKind} at ${formatRecentValue(repo.recent.lastActionAt)}`
                : formatRecentValue(repo.recent.lastSelectedAt)}
            </dd>
          </div>
          <div className="details-row">
            <dt>Failure report</dt>
            <dd>
              {repo.failureReport ? (
                <>
                  <span className="status-pill error">{repo.failureReport.kind}</span>
                  {` ${formatRecentValue(repo.failureReport.generatedAt)} • ${repo.failureReport.workspaceRelativePath}`}
                </>
              ) : 'No failure report recorded'}
            </dd>
          </div>
        </dl>
      </div>

      {sideLoad ? (
        <AccordionSection
          badge={
            <span className={`status-pill ${sideLoad.status}`}>
              {sideLoadStatus}
            </span>
          }
          title="Context cache"
        >
          <p className="section-copy">
            Repo side-load files are generated under <code>cache/context/</code> and treated as optional read-only summaries rather than repo truth.
          </p>

          <dl className="details-list">
            <div className="details-row">
              <dt>Status</dt>
              <dd>
                <span className={`status-pill ${sideLoad.status}`}>
                  {sideLoadStatus}
                </span>
              </dd>
            </div>
            <div className="details-row">
              <dt>Generated</dt>
              <dd>{formatRecentValue(sideLoad.generatedAt)}</dd>
            </div>
            <div className="details-row">
              <dt>Source count</dt>
              <dd>{sideLoad.inputCount}</dd>
            </div>
            <div className="details-row">
              <dt>Abstract</dt>
              <dd>
                {sideLoad.outputs.find((output) => output.role === 'abstract')?.relativePath
                  ?? 'Not generated'}
              </dd>
            </div>
            <div className="details-row">
              <dt>Overview</dt>
              <dd>
                {sideLoad.outputs.find((output) => output.role === 'overview')?.relativePath
                  ?? 'Not generated'}
              </dd>
            </div>
            <div className="details-row">
              <dt>Sources</dt>
              <dd>
                {sideLoad.outputs.find((output) => output.role === 'sources')?.relativePath
                  ?? 'Not generated'}
              </dd>
            </div>
          </dl>

          <div className="action-row">
            <button
              className="action-button"
              disabled={!sideLoad.outputs.find((output) => output.role === 'abstract')}
              onClick={() => {
                const output = sideLoad.outputs.find((entry) => entry.role === 'abstract')
                if (output) {
                  void onOpenWorkspacePath(output.path)
                }
              }}
              type="button"
            >
              Open abstract
            </button>
            <button
              className="action-button"
              disabled={!sideLoad.outputs.find((output) => output.role === 'overview')}
              onClick={() => {
                const output = sideLoad.outputs.find((entry) => entry.role === 'overview')
                if (output) {
                  void onOpenWorkspacePath(output.path)
                }
              }}
              type="button"
            >
              Open overview
            </button>
            <button
              className="action-button"
              disabled={!sideLoad.outputs.find((output) => output.role === 'sources')}
              onClick={() => {
                const output = sideLoad.outputs.find((entry) => entry.role === 'sources')
                if (output) {
                  void onOpenWorkspacePath(output.path)
                }
              }}
              type="button"
            >
              Open sources
            </button>
          </div>
        </AccordionSection>
      ) : null}

      {intakeResult ? (
        <AccordionSection
          badge={<span className="status-pill ready">latest run</span>}
          title="Latest repo intake"
        >
          <p className="section-copy">
            Repo intake stays conservative: it scaffolds docs and explicit runtime metadata without auto-installing dependencies or starting runtimes.
          </p>

          <dl className="details-list">
            <div className="details-row">
              <dt>README</dt>
              <dd>
                {intakeResult.readmeCreated
                  ? 'Created'
                  : intakeResult.readmeUpdated
                    ? 'Updated'
                    : 'Kept in place'}
                {` • ${intakeResult.readmePath}`}
              </dd>
            </div>
            <div className="details-row">
              <dt>Cover image</dt>
              <dd>
                {intakeResult.coverCreated ? 'Created placeholder' : 'Kept in place'}
                {` • ${intakeResult.coverImagePath}`}
              </dd>
            </div>
            <div className="details-row">
              <dt>Manifest</dt>
              <dd>
                {intakeResult.manifestCreated
                  ? `Created • ${intakeResult.manifestPath}`
                  : intakeResult.manifestPath
                    ? `Kept in place • ${intakeResult.manifestPath}`
                    : 'Skipped because the runtime looked clear without one'}
              </dd>
            </div>
          </dl>

          <ul className="troubleshooting-list">
            {intakeResult.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </AccordionSection>
      ) : null}

      <AccordionSection
        badge={
          <span className={`status-pill ${repo.isPinned ? 'ready' : 'unknown'}`}>
            {repo.isPinned ? 'pinned' : 'standard'}
          </span>
        }
        title="Quick copy"
      >

        <div className="action-row">
          <button
            className="action-button"
            disabled={!repo.previewUrl}
            onClick={() => {
              void handleCopy(repo.previewUrl, 'preview URL')
            }}
            type="button"
          >
            Copy preview URL
          </button>
          <button
            className="action-button"
            disabled={!repo.devCommand}
            onClick={() => {
              void handleCopy(repo.devCommand, 'dev command')
            }}
            type="button"
          >
            Copy dev command
          </button>
          <button
            className="action-button"
            disabled={!repo.installCommand}
            onClick={() => {
              void handleCopy(repo.installCommand, 'install command')
            }}
            type="button"
          >
            Copy install command
          </button>
          <button
            className="action-button"
            onClick={() => {
              void handleCopy(repo.relativePath, 'repo path')
            }}
            type="button"
          >
            Copy repo path
          </button>
        </div>

        {copyMessage ? <p className="copy-note">{copyMessage}</p> : null}
      </AccordionSection>

      <AccordionSection
        badge={
          <span className={`status-pill ${hasAgentTooling ? 'ready' : 'unknown'}`}>
            {hasAgentTooling ? 'detected' : 'none'}
          </span>
        }
        title="Agent tooling"
      >
        <p className="section-copy">
          Workspace Hub surfaces repo-local agent layers so official Codex, optional OMX, and OpenCode-style setups stay visible without becoming required workspace dependencies.
        </p>

        <dl className="details-list">
          <div className="details-row">
            <dt>AGENTS.md</dt>
            <dd>{repo.agentTooling.agentsPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>Agent stack</dt>
            <dd>{repo.agentTooling.agentStackPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>Agent skills (.agents)</dt>
            <dd>{repo.agentTooling.codexSkillsPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>Codex config (.codex)</dt>
            <dd>{repo.agentTooling.codexProjectConfigPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>Codex skills (.codex)</dt>
            <dd>{repo.agentTooling.codexProjectSkillsPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>Workspace skills</dt>
            <dd>{repo.agentTooling.workspaceSkillsPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>OMX</dt>
            <dd>{repo.agentTooling.omxPath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>OpenCode</dt>
            <dd>{repo.agentTooling.openCodePath ?? 'Not detected'}</dd>
          </div>
          <div className="details-row">
            <dt>oh-my-openagent</dt>
            <dd>{formatOpenAgentConfigLabel(repo.agentTooling)}</dd>
          </div>
        </dl>

        <p className="section-copy">
          Presets write tracked repo files only. Existing files are preserved, and <code>tools/ref/</code> remains a temporary reference source for extracting base upgrades into workspace-native code, docs, templates, and skills.
        </p>

        <div className="preset-list">
          {repoAgentPresetOptions.map((preset) => {
            const pending =
              actionPendingKey === buildAgentPresetPendingKey(repo.relativePath, preset.id)

            return (
              <div key={preset.id} className="preset-item">
                <div className="preset-copy">
                  <strong>{preset.label}</strong>
                  <p>{preset.description}</p>
                </div>
                <button
                  className="action-button"
                  disabled={pending}
                  onClick={() => {
                    void onApplyAgentPreset(repo.relativePath, preset.id)
                  }}
                  type="button"
                >
                  {pending ? 'Applying...' : `Apply ${preset.label}`}
                </button>
              </div>
            )
          })}
        </div>
      </AccordionSection>

      <AccordionSection
        badge={
          <span className={`status-pill ${repo.hasSavedMetadata ? 'running' : 'unknown'}`}>
            {repo.hasSavedMetadata ? 'saved' : 'inferred'}
          </span>
        }
        title="Saved overrides"
      >

        <div className="editor-grid">
          <label className="field">
            <span>Preferred mode</span>
            <select
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  preferredMode: event.target.value as PreviewMode,
                }))
              }}
              value={draft.preferredMode}
            >
              <option value="direct">direct</option>
              <option value="external">external</option>
              <option value="servbay">mapped host (servbay)</option>
            </select>
          </label>

          <label className="field">
            <span>Tags</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: event.target.value,
                }))
              }}
              placeholder="frontend, prototype"
              type="text"
              value={draft.tags}
            />
          </label>

          <label className="field checkbox-field">
            <span>Pinned</span>
            <input
              checked={draft.pinned}
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  pinned: event.target.checked,
                }))
              }}
              type="checkbox"
            />
          </label>

          <label className="field">
            <span>Dev command override</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  devCommand: event.target.value,
                }))
              }}
              placeholder="pnpm dev"
              type="text"
              value={draft.devCommand}
            />
          </label>

          <label className="field">
            <span>Build command override</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  buildCommand: event.target.value,
                }))
              }}
              placeholder="pnpm build"
              type="text"
              value={draft.buildCommand}
            />
          </label>

          <label className="field">
            <span>Preview URL override</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  previewUrl: event.target.value,
                }))
              }}
              placeholder="http://127.0.0.1:5173"
              type="url"
              value={draft.previewUrl}
            />
          </label>

          <label className="field">
            <span>External URL override</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  externalUrl: event.target.value,
                }))
              }}
              placeholder="https://client-site.local"
              type="url"
              value={draft.externalUrl}
            />
          </label>

          <label className="field">
            <span>Healthcheck URL override</span>
            <input
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  healthcheckUrl: event.target.value,
                }))
              }}
              placeholder="http://127.0.0.1:4101/api/health"
              type="url"
              value={draft.healthcheckUrl}
            />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            onChange={(event) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                notes: event.target.value,
              }))
            }}
            rows={4}
            value={draft.notes}
          />
        </label>

        <div className="action-row">
          <button
            className="action-button primary"
            disabled={actionPendingKey === buildPendingKey(repo.relativePath, 'save-metadata')}
            onClick={() => {
              void onSaveMetadata(repo.relativePath, {
                buildCommand: draft.buildCommand,
                devCommand: draft.devCommand,
                externalUrl: draft.externalUrl,
                healthcheckUrl: draft.healthcheckUrl,
                notes: draft.notes,
                pinned: draft.pinned,
                preferredMode: draft.preferredMode,
                previewUrl: draft.previewUrl,
                tags: normalizeTags(draft.tags),
              })
            }}
            type="button"
          >
            Save overrides
          </button>
          <button
            className="action-button"
            disabled={
              !repo.hasSavedMetadata ||
              actionPendingKey === buildPendingKey(repo.relativePath, 'reset-metadata')
            }
            onClick={() => {
              void onResetMetadata(repo.relativePath)
            }}
            type="button"
          >
            Reset saved overrides
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        badge={
          <span className={`status-pill ${repo.hasManifest ? 'running' : 'unknown'}`}>
            {repo.hasManifest ? 'manifest' : 'draft'}
          </span>
        }
        title="Manifest authoring"
      >

        <p className="section-copy">
          <strong>{repo.recommendedPreset.label}</strong>: {repo.recommendedPreset.rationale}
        </p>

        <div className="action-row">
          <button
            className="action-button"
            onClick={() => {
              setManifestDraft(buildManifestDraft(repo))
            }}
            type="button"
          >
            Reset to current
          </button>
          <button
            className="action-button"
            onClick={() => {
              setManifestDraft(buildManifestDraftFromRecord(repo.suggestedManifest))
            }}
            type="button"
          >
            Reset to preset
          </button>
          <button
            className="action-button primary"
            disabled={
              !manifestReady ||
              actionPendingKey === buildPendingKey(repo.relativePath, 'write-manifest')
            }
            onClick={() => {
              void onWriteManifest(repo.relativePath, manifestPayload)
            }}
            type="button"
          >
            {repo.hasManifest ? 'Write manifest' : 'Create manifest'}
          </button>
        </div>

        <div className="editor-grid">
          <label className="field">
            <span>Name</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  name: event.target.value,
                }))
              }}
              placeholder="Repo name"
              type="text"
              value={manifestDraft.name}
            />
          </label>

          <label className="field">
            <span>Slug</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  slug: event.target.value,
                }))
              }}
              placeholder="repo-slug"
              type="text"
              value={manifestDraft.slug}
            />
          </label>

          <label className="field">
            <span>Type</span>
            <select
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  type: event.target.value as RepoType,
                }))
              }}
              value={manifestDraft.type}
            >
              <option value="node-app">node-app</option>
              <option value="other">other</option>
              <option value="php">php</option>
              <option value="static">static</option>
              <option value="threejs">threejs</option>
              <option value="vite">vite</option>
              <option value="wordpress">wordpress</option>
            </select>
          </label>

          <label className="field">
            <span>Preferred mode</span>
            <select
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  preferredMode: event.target.value as PreviewMode,
                }))
              }}
              value={manifestDraft.preferredMode}
            >
              <option value="direct">direct</option>
              <option value="external">external</option>
              <option value="servbay">mapped host (servbay)</option>
            </select>
          </label>

          <label className="field">
            <span>Package manager</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  packageManager: event.target.value,
                }))
              }}
              placeholder="pnpm"
              type="text"
              value={manifestDraft.packageManager}
            />
          </label>

          <label className="field">
            <span>Tags</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: event.target.value,
                }))
              }}
              placeholder="frontend, prototype"
              type="text"
              value={manifestDraft.tags}
            />
          </label>

          <label className="field">
            <span>Install command</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  installCommand: event.target.value,
                }))
              }}
              placeholder="pnpm install"
              type="text"
              value={manifestDraft.installCommand}
            />
          </label>

          <label className="field">
            <span>Dev command</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  devCommand: event.target.value,
                }))
              }}
              placeholder="pnpm dev"
              type="text"
              value={manifestDraft.devCommand}
            />
          </label>

          <label className="field">
            <span>Build command</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  buildCommand: event.target.value,
                }))
              }}
              placeholder="pnpm build"
              type="text"
              value={manifestDraft.buildCommand}
            />
          </label>

          <label className="field">
            <span>Preview command</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  previewCommand: event.target.value,
                }))
              }}
              placeholder="pnpm preview"
              type="text"
              value={manifestDraft.previewCommand}
            />
          </label>

          <label className="field">
            <span>Preview URL</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  previewUrl: event.target.value,
                }))
              }}
              placeholder="http://127.0.0.1:5173"
              type="url"
              value={manifestDraft.previewUrl}
            />
          </label>

          <label className="field">
            <span>External URL</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  externalUrl: event.target.value,
                }))
              }}
              placeholder="https://client-site.local"
              type="url"
              value={manifestDraft.externalUrl}
            />
          </label>

          <label className="field">
            <span>Healthcheck URL</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  healthcheckUrl: event.target.value,
                }))
              }}
              placeholder="http://127.0.0.1:4101/api/health"
              type="url"
              value={manifestDraft.healthcheckUrl}
            />
          </label>

          <label className="field">
            <span>Mapped-host path</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  servbayPath: event.target.value,
                }))
              }}
              placeholder="/repo/example"
              type="text"
              value={manifestDraft.servbayPath}
            />
          </label>

          <label className="field">
            <span>Mapped-host subdomain</span>
            <input
              onChange={(event) => {
                setManifestDraft((currentDraft) => ({
                  ...currentDraft,
                  servbaySubdomain: event.target.value,
                }))
              }}
              placeholder="workspace-hub"
              type="text"
              value={manifestDraft.servbaySubdomain}
            />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            onChange={(event) => {
              setManifestDraft((currentDraft) => ({
                ...currentDraft,
                notes: event.target.value,
              }))
            }}
            rows={4}
            value={manifestDraft.notes}
          />
        </label>

        <label className="field">
          <span>Manifest preview</span>
          <pre className="manifest-preview">{JSON.stringify(manifestPayload, null, 2)}</pre>
        </label>
      </AccordionSection>

      <AccordionSection
        badge={
          <span className={`status-pill ${hasTroubleshootingAttention ? 'error' : 'ready'}`}>
            {hasTroubleshootingAttention ? 'attention' : 'clear'}
          </span>
        }
        defaultOpen={hasTroubleshootingAttention}
        title="Troubleshooting"
      >

        <p className="section-copy">
          Common repo recovery notes live in <code>docs/runtime-troubleshooting.md</code>.
        </p>

        <ul className="troubleshooting-list">
          {troubleshootingTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        {repo.preferredMode === 'servbay' ? (
          <p className="section-copy troubleshooting-followup">
            Mapped-host previews are only reliable when the repo has a tested path or subdomain and the saved preview URL matches the operator&apos;s local routing setup.
          </p>
        ) : null}
      </AccordionSection>

      {actionError ? (
        <div className="inline-error" aria-live="polite">
          {actionError}
        </div>
      ) : null}

      <AccordionSection title="Diagnostics, logs, and metadata">
      <dl className="details-list">
        <div className="details-row">
          <dt>Runtime status</dt>
          <dd>
            <span className={`status-pill ${repo.runtime.status}`}>
              {repo.runtime.status}
            </span>
          </dd>
        </div>
        <div className="details-row">
          <dt>Saved metadata</dt>
          <dd>
            {repo.hasSavedMetadata
              ? `Updated ${repo.metadataUpdatedAt ?? 'recently'}`
              : 'No saved overrides'}
          </dd>
        </div>
        <div className="details-row">
          <dt>PID</dt>
          <dd>{repo.runtime.pid ?? 'Not running'}</dd>
        </div>
        <div className="details-row">
          <dt>Path</dt>
          <dd>{repo.relativePath}</dd>
        </div>
        <div className="details-row">
          <dt>Type</dt>
          <dd>{repo.type}</dd>
        </div>
        <div className="details-row">
          <dt>Preferred mode</dt>
          <dd>{repo.preferredMode}</dd>
        </div>
        <div className="details-row">
          <dt>Package manager</dt>
          <dd>{repo.packageManager || 'manual'}</dd>
        </div>
        <div className="details-row">
          <dt>Discovery</dt>
          <dd>{repo.hasManifest ? 'manifest-backed' : repo.detectedBy}</dd>
        </div>
        <div className="details-row">
          <dt>Collection</dt>
          <dd>{repo.location === 'direct' ? 'direct repo' : repo.collection}</dd>
        </div>
        <div className="details-row">
          <dt>Pinned</dt>
          <dd>{repo.isPinned ? 'Pinned to the top of the repo list' : 'Not pinned'}</dd>
        </div>
        <div className="details-row">
          <dt>Last selected</dt>
          <dd>{formatRecentValue(repo.recent.lastSelectedAt)}</dd>
        </div>
        <div className="details-row">
          <dt>Last opened</dt>
          <dd>{formatRecentValue(repo.recent.lastOpenedAt)}</dd>
        </div>
        <div className="details-row">
          <dt>Last action</dt>
          <dd>
            {repo.recent.lastActionKind
              ? `${repo.recent.lastActionKind} at ${formatRecentValue(repo.recent.lastActionAt)}`
              : 'No recent action recorded'}
          </dd>
        </div>
        <div className="details-row">
          <dt>Git</dt>
          <dd>
            <span className={`status-pill ${repo.git.state}`}>{repo.git.state}</span>
            {' '}
            <span className="details-inline-copy">{repo.git.summary}</span>
          </dd>
        </div>
        <div className="details-row">
          <dt>Visibility</dt>
          <dd>
            <span className={`status-pill ${repo.git.visibility}`}>
              {repo.git.visibility === 'local-only' ? 'local only' : repo.git.visibility}
            </span>
            {repo.git.remoteUrl ? ` ${repo.git.remoteUrl}` : ' No remote configured'}
          </dd>
        </div>
        <div className="details-row">
          <dt>Dependencies</dt>
          <dd>
            <span className={`status-pill ${repo.dependencies.state}`}>
              {formatDependencyStateLabel(repo.dependencies.state)}
            </span>
            {` ${repo.dependencies.reason}`}
            {repo.dependencies.installPath ? (
              <>
                {' '}
                <code>{repo.dependencies.installPath}</code>
              </>
            ) : null}
          </dd>
        </div>
        <div className="details-row">
          <dt>Agent tooling</dt>
          <dd className="tag-group">
            {hasAgentTooling ? (
              agentToolingLabels.map((label) => (
                <span key={label} className="tag">
                  {label}
                </span>
              ))
            ) : (
              'No repo-local agent tooling detected'
            )}
          </dd>
        </div>
        <div className="details-row">
          <dt>Install status</dt>
          <dd>
            <span className={`status-pill ${repo.install.status}`}>{repo.install.status}</span>
            {repo.install.message ? ` ${repo.install.message}` : ''}
          </dd>
        </div>
        <div className="details-row">
          <dt>Dev command</dt>
          <dd>{repo.devCommand ?? 'Not inferred yet'}</dd>
        </div>
        <div className="details-row">
          <dt>Build command</dt>
          <dd>{repo.buildCommand ?? 'Not inferred yet'}</dd>
        </div>
        <div className="details-row">
          <dt>Preview command</dt>
          <dd>{repo.previewCommand ?? 'Not inferred yet'}</dd>
        </div>
        <div className="details-row">
          <dt>Install command</dt>
          <dd>{repo.installCommand ?? 'Not inferred yet'}</dd>
        </div>
        <div className="details-row">
          <dt>Install update</dt>
          <dd>{repo.install.updatedAt ?? 'No install activity yet'}</dd>
        </div>
        <div className="details-row">
          <dt>README</dt>
          <dd>{repo.readmePath ?? 'No README detected'}</dd>
        </div>
        <div className="details-row">
          <dt>Manifest</dt>
          <dd>{repo.manifestPath ?? 'No manifest detected'}</dd>
        </div>
        <div className="details-row">
          <dt>Codex config (.codex)</dt>
          <dd>{repo.agentTooling.codexProjectConfigPath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>Codex skills (.codex)</dt>
          <dd>{repo.agentTooling.codexProjectSkillsPath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>Agent skills (.agents)</dt>
          <dd>{repo.agentTooling.codexSkillsPath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>Agent stack</dt>
          <dd>{repo.agentTooling.agentStackPath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>OMX</dt>
          <dd>{repo.agentTooling.omxPath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>OpenCode</dt>
          <dd>{repo.agentTooling.openCodePath ?? 'Not detected'}</dd>
        </div>
        <div className="details-row">
          <dt>oh-my-openagent</dt>
          <dd>{formatOpenAgentConfigLabel(repo.agentTooling)}</dd>
        </div>
        <div className="details-row">
          <dt>Preset</dt>
          <dd>{repo.recommendedPreset.label}</dd>
        </div>
        <div className="details-row">
          <dt>Preview URL</dt>
          <dd>
            {repo.previewUrl
              ? `${repo.previewUrl} (${repo.previewUrlSource})`
              : 'No preview URL set'}
          </dd>
        </div>
        <div className="details-row">
          <dt>Healthcheck</dt>
          <dd>{repo.healthcheckUrl ?? 'No healthcheck URL set'}</dd>
        </div>
        <div className="details-row">
          <dt>Mapped host</dt>
          <dd>
            {repo.servbaySubdomain
              ? `${repo.servbaySubdomain} subdomain`
              : repo.servbayPath ?? 'No mapped-host routing set'}
          </dd>
        </div>
        <div className="details-row">
          <dt>Health</dt>
          <dd>
            <span className={`status-pill ${repo.health.state}`}>
              {repo.health.state}
            </span>
            {repo.health.url ? ` ${repo.health.url}` : ''}
            {repo.health.httpStatus ? ` (HTTP ${repo.health.httpStatus})` : ''}
          </dd>
        </div>
        <div className="details-row">
          <dt>Last update</dt>
          <dd>{repo.runtime.updatedAt ?? 'No runtime activity yet'}</dd>
        </div>
        <div className="details-row">
          <dt>Exit state</dt>
          <dd>
            {repo.runtime.lastExitCode !== null
              ? `exit ${repo.runtime.lastExitCode}`
              : repo.runtime.lastSignal
                ? `signal ${repo.runtime.lastSignal}`
                : repo.runtime.message ?? 'No recorded exit'}
          </dd>
        </div>
        <div className="details-row stacked">
          <dt>Install log</dt>
          <dd>
            {repo.install.logTail.length ? (
              <pre className="log-tail">{repo.install.logTail.join('\n')}</pre>
            ) : (
              'No install log captured yet.'
            )}
          </dd>
        </div>
        <div className="details-row stacked">
          <dt>Recent logs</dt>
          <dd>
            {repo.runtime.logTail.length ? (
              <pre className="log-tail">{repo.runtime.logTail.join('\n')}</pre>
            ) : (
              'No runtime logs captured yet.'
            )}
          </dd>
        </div>
        <div className="details-row stacked">
          <dt>Notes</dt>
          <dd>{repo.notes || 'No notes yet.'}</dd>
        </div>
        <div className="details-row stacked">
          <dt>Tags</dt>
          <dd className="tag-group">
            {repo.tags.length ? (
              repo.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              'No tags'
            )}
          </dd>
        </div>
      </dl>
      </AccordionSection>
    </>
  )
}
