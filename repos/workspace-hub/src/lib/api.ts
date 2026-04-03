import type {
  RepoAgentPresetId,
  RepoAgentPresetResult,
  WorkspaceEvent,
  WorkspaceSearchResponse,
  WorkspaceSummary,
} from '../types/workspace.ts'

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message ?? `Request failed with ${response.status}.`
  } catch {
    return `Request failed with ${response.status}.`
  }
}

export async function fetchWorkspaceSummary(signal?: AbortSignal) {
  const response = await fetch('/api/workspace/summary', { signal })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as WorkspaceSummary
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
  const response = await fetch('/api/repos/open', {
    body: JSON.stringify({ relativePath, target }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function openWorkspacePath(targetPath: string) {
  const response = await fetch('/api/open/path', {
    body: JSON.stringify({ path: targetPath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function searchWorkspace(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query })
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
  const response = await fetch('/api/repos/install', {
    body: JSON.stringify({ relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function runRepoIntake(relativePath: string) {
  const response = await fetch('/api/repos/intake', {
    body: JSON.stringify({ relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function generateRepoCover(relativePath: string) {
  const response = await fetch('/api/repos/cover', {
    body: JSON.stringify({ relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function recordRepoActivity(
  relativePath: string,
  kind: 'select',
) {
  const response = await fetch('/api/repos/activity', {
    body: JSON.stringify({ kind, relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function writeRepoManifest(
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
    preferredMode: 'direct' | 'external' | 'servbay'
    previewCommand?: string
    previewUrl?: string
    servbayPath?: string
    servbaySubdomain?: string
    slug: string
    tags?: string[]
    type: 'node-app' | 'other' | 'php' | 'static' | 'threejs' | 'vite' | 'wordpress'
  },
) {
  const response = await fetch('/api/repos/manifest', {
    body: JSON.stringify({ manifest, relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function applyRepoAgentPreset(
  relativePath: string,
  preset: RepoAgentPresetId,
) {
  const response = await fetch('/api/repos/agent-preset', {
    body: JSON.stringify({ preset, relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as {
    ok: true
    result: RepoAgentPresetResult
  }
}

export async function runRepoRuntimeAction(
  relativePath: string,
  action: 'restart' | 'start' | 'stop',
) {
  const response = await fetch('/api/repos/runtime', {
    body: JSON.stringify({ action, relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function stopAllRuntimes() {
  const response = await fetch('/api/runtime/stop-all', {
    method: 'POST',
  })

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
    preferredMode: 'direct' | 'external' | 'servbay'
    previewUrl?: string
    tags: string[]
  },
) {
  const response = await fetch('/api/repos/metadata', {
    body: JSON.stringify({ metadata, relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export async function resetRepoMetadata(relativePath: string) {
  const response = await fetch('/api/repos/metadata/reset', {
    body: JSON.stringify({ relativePath }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}
