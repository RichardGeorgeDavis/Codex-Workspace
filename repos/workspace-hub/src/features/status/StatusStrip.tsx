import type { ReactNode } from 'react'

import type { WorkspaceSummary } from '../../types/workspace.ts'

type StatusStripProps = {
  loading: boolean
  onStopAll: () => void
  stopAllPending: boolean
  summary: WorkspaceSummary | null
}

export function StatusStrip({
  loading,
  onStopAll,
  stopAllPending,
  summary,
}: StatusStripProps) {
  const archiveCount = summary?.stats.archiveFiles ?? 0
  const runningRepos = summary?.stats.runningRepos ?? 0
  const items: {
    label: string
    note: ReactNode
    value: number | string
  }[] = [
    {
      label: 'Discovered repos',
      note: (
        <>
          Current repo records in the Hub
          {!loading && archiveCount ? (
            <span className="status-card-subnote">Archived files: {archiveCount}</span>
          ) : null}
        </>
      ),
      value: summary?.stats.discoveredRepos ?? '--',
    },
    {
      label: 'Runnable repos',
      note: 'Repos with an inferred dev command',
      value: summary?.stats.runnableRepos ?? '--',
    },
    {
      label: 'Running now',
      note: 'Repos currently managed by the Hub',
      value: runningRepos,
    },
    {
      label: 'External mode',
      note: loading ? 'Reading preview defaults...' : 'Repos preferring external handling',
      value: summary?.stats.externalPreferredRepos ?? '--',
    },
  ]

  return (
    <section className="status-strip reveal" aria-label="Workspace status">
      {items.map((item) => {
        const isRunningCard = item.label === 'Running now'

        return (
          <article key={item.label} className="status-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
            {isRunningCard ? (
              <div className="status-card-actions">
                <button
                  className="action-button"
                  disabled={loading || stopAllPending || runningRepos === 0}
                  onClick={onStopAll}
                  type="button"
                >
                  {stopAllPending ? 'Stopping all...' : 'Stop all'}
                </button>
              </div>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
