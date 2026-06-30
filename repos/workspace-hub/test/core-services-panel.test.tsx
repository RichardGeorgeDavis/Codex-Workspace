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
    cacheRoot: '/tmp/workspace/cache/fixture-service/test-user',
    category: 'fixture',
    description: 'Local fixture service for Codex Workspace.',
    docsPath: '/tmp/workspace/docs/11-core-memory-and-reference-promotion.md',
    id: 'fixture-service',
    install: {
      command: 'tools/bin/fixture-service install',
      finishedAt: null,
      lastExitCode: null,
      lastSignal: null,
      logTail: [],
      message: null,
      startedAt: null,
      status: 'idle',
      updatedAt: null,
    },
    installCommand: 'tools/bin/fixture-service install',
    installCommandArgs: ['/tmp/workspace/tools/bin/fixture-service', 'install'],
    lastCommandAt: null,
    lastCommandKind: null,
    lastCommandTarget: null,
    lastInstallAt: null,
    lastRuntimeStartAt: null,
    lastSyncAt: null,
    maintenancePaused: false,
    maintenancePausedReason: null,
    name: 'Fixture Service',
    notes: '',
    originUrl: 'https://example.com/fixture-service.git',
    readmePath: '/tmp/workspace/tools/services/fixture-service/README.md',
    repoPath: '/tmp/workspace/tools/services/fixture-service',
    repoPresent: true,
    repoRelativePath: 'tools/services/fixture-service',
    runtime: {
      command: 'tools/bin/fixture-service start',
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
    runtimeCommand: 'tools/bin/fixture-service start',
    runtimeCommandArgs: ['/tmp/workspace/tools/bin/fixture-service', 'start'],
    sharedRoot: '/tmp/workspace/shared/fixture-service/test-user',
    statePath: '/tmp/workspace/shared/fixture-service/test-user/service-state.json',
    syncCommand: 'tools/bin/fixture-service sync',
    syncCommandArgs: ['/tmp/workspace/tools/bin/fixture-service', 'sync'],
    updatedAt: null,
    upstreamUrl: null,
    user: 'test-user',
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
  assert.match(markup, /Fixture Service/)
  assert.match(markup, /tools\/services\/fixture-service/)
})

test('CoreServicesPanel empty state points at workspace capabilities manifest', () => {
  const markup = renderPanel([], [])

  assert.match(markup, /No core services are configured\./)
  assert.match(markup, /tools\/manifests\/workspace-capabilities\.json/)
  assert.doesNotMatch(markup, /tools\/manifests\/core-services\.json/)
})
