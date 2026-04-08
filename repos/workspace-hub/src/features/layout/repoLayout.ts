export type RepoLayoutMode = 'discovery-first' | 'split'

const repoLayoutModes = new Set<RepoLayoutMode>(['discovery-first', 'split'])
export const defaultRepoLayoutMode: RepoLayoutMode = 'split'
export const repoLayoutStorageKey = 'workspace-hub.repo-layout'

export function isRepoLayoutMode(value: unknown): value is RepoLayoutMode {
  return typeof value === 'string' && repoLayoutModes.has(value as RepoLayoutMode)
}

export function resolveRepoLayoutMode(value: unknown): RepoLayoutMode {
  return isRepoLayoutMode(value) ? value : defaultRepoLayoutMode
}

export function loadStoredRepoLayoutMode() {
  if (typeof window === 'undefined') {
    return defaultRepoLayoutMode
  }

  try {
    const storedValue = window.localStorage.getItem(repoLayoutStorageKey)

    if (!storedValue) {
      return defaultRepoLayoutMode
    }

    return resolveRepoLayoutMode(JSON.parse(storedValue))
  } catch {
    return defaultRepoLayoutMode
  }
}

export function persistRepoLayoutMode(mode: RepoLayoutMode) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(repoLayoutStorageKey, JSON.stringify(mode))
  } catch {
    // Ignore storage failures and keep the in-memory preference active.
  }
}

export function resolveSelectedRepoPath(
  layoutMode: RepoLayoutMode,
  repoPaths: string[],
  currentSelectedPath: string | null,
  defaultPath: string | null,
) {
  if (!repoPaths.length) {
    return null
  }

  if (currentSelectedPath && repoPaths.includes(currentSelectedPath)) {
    return currentSelectedPath
  }

  if (layoutMode === 'split') {
    return defaultPath ?? repoPaths[0] ?? null
  }

  return null
}
