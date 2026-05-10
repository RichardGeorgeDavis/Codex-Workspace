import type {
  RepoIntakeResult,
  WorkspaceCapabilitiesSnapshot,
  WorkspaceCapabilityActionId,
  WorkspaceCoreServiceTargetContext,
  WorkspaceRepo,
  WorkspaceSearchResponse,
  RepoAgentPresetId,
  RepoAgentPresetResult,
  SummaryRequestReason,
  WorkspaceEvent,
  WorkspaceSummary,
} from '../types/workspace.ts'
import { workspaceHubIntentHeaders } from './workspaceHubIntent.ts'

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message ?? `Request failed with ${response.status}.`
  } catch {
    return `Request failed with ${response.status}.`
  }
}

const workspaceHubJsonHeaders = {
  'Content-Type': 'application/json',
  ...workspaceHubIntentHeaders,
} as const

function postJson(pathname: string, payload: unknown) {
  return fetch(pathname, {
    body: JSON.stringify(payload),
    headers: workspaceHubJsonHeaders,
    method: 'POST',
  })
}

function postAction(pathname: string) {
  return fetch(pathname, {
    headers: workspaceHubIntentHeaders,
    method: 'POST',
  })
}

function withSummaryReason(
  pathname: string,
  reason: SummaryRequestReason,
  options: { includeArchives?: boolean } = {},
) {
  const params = new URLSearchParams({ reason })

  if (options.includeArchives) {
    params.set('includeArchives', 'true')
  }

  return `${pathname}?${params.toString()}`
}

export async function fetchWorkspaceSummary(
  signal?: AbortSignal,
  reason: SummaryRequestReason = 'manual-refresh',
  options: { includeArchives?: boolean } = {},
) {
  const response = await fetch(withSummaryReason('/api/workspace/summary', reason, options), { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceSummary
}

export async function fetchWorkspaceSummaryBase(
  signal?: AbortSignal,
  reason: SummaryRequestReason = 'event',
  options: { includeArchives?: boolean } = {},
) {
  const response = await fetch(withSummaryReason('/api/workspace/summary/base', reason, options), { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceSummary
}

export async function fetchWorkspaceRepoDetails(
  relativePath: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ relativePath })
  const response = await fetch(`/api/repos/details?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceRepo
}

export async function fetchWorkspaceCapabilitiesSnapshot(signal?: AbortSignal) {
  const response = await fetch('/api/capabilities', { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceCapabilitiesSnapshot
}

export async function openRepoTarget(
  relativePath: string,
  target:
    | 'failure-report'
    | 'manifest'
    | 'preview'
    | 'readme'
    | 'repo'
    | 'terminal'
    | 'troubleshooting',
) {
  const response = await postJson('/api/repos/open', { relativePath, target })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function openWorkspacePath(targetPath: string) {
  const response = await postJson('/api/open/path', { path: targetPath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function openCoreServiceTarget(
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
) {
  const response = await postJson('/api/services/open', {
    serviceId,
    target,
    targetPath: targetPath ?? null,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function openWorkspaceCapabilityTarget(
  capabilityId: string,
  target: 'docs' | 'readme' | 'repo',
) {
  const response = await postJson('/api/capabilities/open', { capabilityId, target })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function runWorkspaceCapabilityAction(
  capabilityId: string,
  action: WorkspaceCapabilityActionId,
) {
  const response = await postJson('/api/capabilities/action', {
    action,
    capabilityId,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = await response.json()
  if (!data || typeof data !== 'object' || !('ok' in data) || !('output' in data)) {
    throw new Error('Malformed response received from capability action endpoint')
  }

  return data as {
    ok: boolean
    output: string
  }
}

export async function fetchCoreServiceTargetContext(
  serviceId: string,
  payload: {
    currentRepoRelativePath?: string | null
    repoRelativePath?: string | null
    targetKind: 'current-repo' | 'repo' | 'workspace-docs'
  },
) {
  const response = await postJson('/api/services/context', { serviceId, ...payload })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceCoreServiceTargetContext
}

export async function runCoreServiceCommand(
  serviceId: string,
  payload: {
    commandId:
      | 'build-graph'
      | 'export-codex-current'
      | 'mine-codex-current'
      | 'runtime-start'
      | 'search'
      | 'save-repo'
      | 'save-workspace'
      | 'status'
      | 'sync'
      | 'wake-up'
    repoRelativePath?: string | null
    searchQuery?: string | null
  },
) {
  const response = await postJson('/api/services/command', { serviceId, ...payload })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as {
    command: string
    ok: boolean
    output: string
  }
}

export async function searchWorkspace(
  query: string,
  mode: WorkspaceSearchResponse['mode'] = 'thin',
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ mode, q: query })
  const response = await fetch(`/api/search?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceSearchResponse
}

export function subscribeWorkspaceEvents(
  onEvent: (event: WorkspaceEvent) => void,
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected') => void,
) {
  onStatusChange?.('connecting')

  const source = new EventSource('/api/events')

  source.onopen = () => {
    onStatusChange?.('connected')
  }

  source.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data) as WorkspaceEvent)
    } catch {
      // Ignore malformed event payloads.
    }
  }

  source.onerror = () => {
    onStatusChange?.('disconnected')
  }

  return () => {
    source.close()
  }
}

export async function runRepoInstall(relativePath: string) {
  const response = await postJson('/api/repos/install', { relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function runCoreServiceInstall(serviceId: string) {
  const response = await postJson('/api/services/install', { serviceId })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function runRepoIntake(relativePath: string) {
  const response = await postJson('/api/repos/intake', { relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = await response.json()
  if (!data || typeof data !== 'object' || !('ok' in data) || !('result' in data)) {
    throw new Error('Malformed response received from intake endpoint')
  }

  return data as {
    ok: boolean
    result: RepoIntakeResult
  }
}

export async function generateRepoCover(relativePath: string) {
  const response = await postJson('/api/repos/cover', { relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function recordRepoActivity(
  relativePath: string,
  kind: 'select',
) {
  const response = await postJson('/api/repos/activity', { kind, relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function writeRepoManifest(
  relativePath: string,
  manifest: {
    buildCommand?: string
    devCommand?: string
    entryDocs?: string[]
    externalUrl?: string
    healthcheckUrl?: string
    installCommand?: string
    name: string
    notes?: string
    packageManager?: string
    preferredMode: 'direct' | 'external' | 'mapped-host'
    previewCommand?: string
    previewUrl?: string
    mappedHostPath?: string
    mappedHostSubdomain?: string
    slug: string
    tags?: string[]
    type: 'node-app' | 'other' | 'php' | 'static' | 'threejs' | 'vite' | 'wordpress'
  },
) {
  const response = await postJson('/api/repos/manifest', { manifest, relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function applyRepoAgentPreset(
  relativePath: string,
  preset: RepoAgentPresetId,
) {
  const response = await postJson('/api/repos/agent-preset', {
    preset,
    relativePath,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = await response.json()
  if (!data || typeof data !== 'object' || !('ok' in data) || !('result' in data)) {
    throw new Error('Malformed response received from agent preset endpoint')
  }

  return data as {
    ok: true
    result: RepoAgentPresetResult
  }
}

export async function runRepoRuntimeAction(
  relativePath: string,
  action: 'restart' | 'start' | 'stop',
) {
  const response = await postJson('/api/repos/runtime', { action, relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function runCoreServiceRuntimeAction(
  serviceId: string,
  action: 'restart' | 'start' | 'stop',
) {
  const response = await postJson('/api/services/runtime', { action, serviceId })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function syncCoreService(serviceId: string) {
  const response = await postJson('/api/services/sync', { serviceId })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function stopAllRuntimes() {
  const response = await postAction('/api/runtime/stop-all')

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function saveRepoMetadata(
  relativePath: string,
  metadata: {
    buildCommand?: string
    devCommand?: string
    externalUrl?: string
    healthcheckUrl?: string
    notes: string
    pinned: boolean
    preferredMode: 'direct' | 'external' | 'mapped-host'
    previewUrl?: string
    tags: string[]
  },
) {
  const response = await postJson('/api/repos/metadata', { metadata, relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function resetRepoMetadata(relativePath: string) {
  const response = await postJson('/api/repos/metadata/reset', { relativePath })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}
