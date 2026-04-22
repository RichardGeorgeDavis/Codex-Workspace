import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { CoreServicesPanel } from '../src/features/services/CoreServicesPanel.tsx'
import type { WorkspaceCoreService } from '../src/types/workspace.ts'

;(globalThis as typeof globalThis & { React: typeof React }).React = React

function buildService(): WorkspaceCoreService {
  return {
    branch: 'main',
    cacheRoot: '/tmp/workspace/cache/mempalace/test-user',
    category: 'memory',
    configPath: '/tmp/workspace/shared/mempalace/test-user/home/.mempalace/config.json',
    description: 'Local long-term memory and retrieval service for Codex Workspace.',
    docsPath: '/tmp/workspace/docs/11-core-memory-and-reference-promotion.md',
    exportsRoot: '/tmp/workspace/shared/mempalace/test-user/exports',
    homePath: '/tmp/workspace/shared/mempalace/test-user/home',
    id: 'mempalace',
    identityPath: '/tmp/workspace/shared/mempalace/test-user/home/.mempalace/identity.txt',
    install: {
      command: 'tools/bin/workspace-memory install',
      finishedAt: null,
      lastExitCode: null,
      lastSignal: null,
      logTail: [],
      message: null,
      startedAt: null,
      status: 'idle',
      updatedAt: null,
    },
    installCommand: 'tools/bin/workspace-memory install',
    installCommandArgs: ['/tmp/workspace/tools/bin/workspace-memory', 'install'],
    lastCodexExportAt: null,
    lastCodexExportTarget: null,
    lastCommandAt: null,
    lastCommandKind: null,
    lastCommandTarget: null,
    lastIngestAt: null,
    lastIngestTarget: null,
    lastInstallAt: null,
    lastRuntimeStartAt: null,
    lastSaveAt: null,
    lastSaveTarget: null,
    lastSearchAt: null,
    lastSearchQuery: null,
    lastSyncAt: null,
    lastWakeUpAt: null,
    name: 'MemPalace',
    notes: '',
    originUrl: 'https://github.com/milla-jovovich/mempalace.git',
    readmePath: '/tmp/workspace/tools/mempalace/README.md',
    repoPath: '/tmp/workspace/tools/mempalace',
    repoPresent: true,
    repoRelativePath: 'tools/mempalace',
    runtime: {
      command: 'tools/bin/mempalace-start',
      lastExitCode: null,
      lastSignal: null,
      logTail: [],
      message: null,
      pid: null,
      startedAt: null,
      status: 'idle',
      stoppedAt: null,
      updatedAt: null,
    },
    runtimeCommand: 'tools/bin/mempalace-start',
    runtimeCommandArgs: ['/tmp/workspace/tools/bin/mempalace-start'],
    sharedRoot: '/tmp/workspace/shared/mempalace/test-user',
    statePath: '/tmp/workspace/shared/mempalace/test-user/service-state.json',
    syncCommand: 'tools/bin/mempalace-sync',
    syncCommandArgs: ['/tmp/workspace/tools/bin/mempalace-sync'],
    updatedAt: null,
    upstreamUrl: null,
    user: 'test-user',
    venvPath: '/tmp/workspace/tools/mempalace/.venv/bin/python',
    venvReady: true,
    version: '0.1.0',
  }
}

function renderPanel(
  services: WorkspaceCoreService[],
  manifestIssues: Array<{
    remediation: string
    reason: string
    serviceId: string | null
    serviceName: string | null
  }>,
) {
  return renderToStaticMarkup(
    React.createElement(CoreServicesPanel, {
      actionPendingKey: null,
      loading: false,
      manifestIssues,
      onInstallAction: async () => {},
      onOpenAction: async () => {},
      onOpenServiceWorkspace: () => {},
      onRuntimeAction: async () => {},
      onSelectService: () => {},
      onSyncAction: async () => {},
      selectedServiceId: null,
      services,
    }),
  )
}

test('CoreServicesPanel renders skipped manifest warnings with remediation', () => {
  const markup = renderPanel([buildService()], [
    {
      remediation: 'Use a workspace-relative `docsPath` that stays inside the workspace.',
      reason: 'Docs path resolves outside the workspace root and was rejected.',
      serviceId: 'bad-docs',
      serviceName: 'Bad Docs',
    },
  ])

  assert.match(markup, /Skipped manifest entries/)
  assert.match(markup, /tools\/manifests\/workspace-capabilities\.json/)
  assert.match(markup, /Docs path resolves outside the workspace root and was rejected\./)
  assert.match(markup, /Use a workspace-relative `docsPath` that stays inside the workspace\./)
})

test('CoreServicesPanel empty state points at workspace capabilities manifest', () => {
  const markup = renderPanel([], [])

  assert.match(markup, /No core services are configured\./)
  assert.match(markup, /tools\/manifests\/workspace-capabilities\.json/)
  assert.doesNotMatch(markup, /tools\/manifests\/core-services\.json/)
})
