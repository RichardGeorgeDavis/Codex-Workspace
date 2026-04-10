import type { WorkspaceRepo, WorkspaceSummary } from '../types/workspace.ts'

function mergeProjectedRepo(
  incoming: WorkspaceRepo,
  previous: WorkspaceRepo,
): WorkspaceRepo {
  return {
    ...incoming,
    detailLevel: 'detail',
    install: {
      ...incoming.install,
      logTail: previous.install.logTail,
    },
    notes: previous.notes,
    runtime: {
      ...incoming.runtime,
      logTail: previous.runtime.logTail,
    },
    savedMetadata: previous.savedMetadata,
    sideLoad: incoming.sideLoad ?? previous.sideLoad,
    suggestedManifest: previous.suggestedManifest,
  }
}

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
      const prior = prevByPath.get(repo.path)

      if (repo.diagnosticsFreshness !== 'skipped') {
        if (repo.sideLoad === undefined && prior?.sideLoad !== undefined) {
          changed = true
          return {
            ...repo,
            sideLoad: prior.sideLoad,
          }
        }

        if (repo.detailLevel === 'list' && prior?.detailLevel === 'detail') {
          changed = true
          return mergeProjectedRepo(repo, prior)
        }

        return repo
      }

      if (!prior || prior.diagnosticsFreshness === 'skipped') {
        return repo
      }

      changed = true
      const mergedRepo = {
        ...repo,
        dependencies: prior.dependencies,
        diagnosticsFreshness: prior.diagnosticsFreshness,
        git: prior.git,
        health: prior.health,
      }

      if (mergedRepo.detailLevel === 'list' && prior.detailLevel === 'detail') {
        return mergeProjectedRepo(mergedRepo, prior)
      }

      return mergedRepo
    })

  if (!changed) {
    return base
  }

  return {
    ...base,
    repos,
  }
}

export function mergeWorkspaceRepoDetails(
  summary: WorkspaceSummary,
  detailedRepo: WorkspaceRepo,
): WorkspaceSummary {
  let changed = false

  const repos = summary.repos.map((repo) => {
    if (repo.path !== detailedRepo.path) {
      return repo
    }

    changed = true
    return detailedRepo
  })

  if (!changed) {
    return summary
  }

  return {
    ...summary,
    repos,
  }
}
