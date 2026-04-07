import type { WorkspaceSummary } from '../types/workspace.ts'

export function needsDiagnosticsHydration(
  merged: WorkspaceSummary,
  previous: WorkspaceSummary | null,
): boolean {
  if (!previous) {
    return merged.repos.some((repo) => repo.diagnosticsFreshness === 'skipped')
  }

  const prevByPath = new Map(previous.repos.map((repo) => [repo.path, repo]))

  return merged.repos.some((repo) => {
    if (repo.diagnosticsFreshness !== 'skipped') {
      return false
    }

    const prior = prevByPath.get(repo.path)
    return !prior || prior.diagnosticsFreshness === 'skipped'
  })
}

export function mergeWorkspaceSummaryDiagnostics(
  base: WorkspaceSummary,
  previous: WorkspaceSummary | null,
): WorkspaceSummary {
  if (!previous) {
    return base
  }

  const prevByPath = new Map(previous.repos.map((repo) => [repo.path, repo]))
  let changed = false

  const repos = base.repos.map((repo) => {
      if (repo.diagnosticsFreshness !== 'skipped') {
        return repo
      }

      const prior = prevByPath.get(repo.path)
      if (!prior || prior.diagnosticsFreshness === 'skipped') {
        return repo
      }

      changed = true
      return {
        ...repo,
        dependencies: prior.dependencies,
        diagnosticsFreshness: prior.diagnosticsFreshness,
        git: prior.git,
        health: prior.health,
      }
    })

  if (!changed) {
    return base
  }

  return {
    ...base,
    repos,
  }
}
