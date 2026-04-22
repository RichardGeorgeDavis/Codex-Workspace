import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { RepoDetails } from '../src/features/repos/RepoDetails.tsx'
import type { RepoIntakeResult, WorkspaceRepo } from '../src/types/workspace.ts'

;(globalThis as typeof globalThis & { React: typeof React }).React = React

function buildRepo(sideLoad: WorkspaceRepo['sideLoad']): WorkspaceRepo {
  return {
    agentTooling: {
      agentsPath: null,
      agentStackPath: null,
      codexProjectConfigPath: null,
      codexProjectSkillsPath: null,
      codexSkillsPath: null,
      omxPath: null,
      openAgentConfigPath: null,
      openAgentLegacyConfigPath: null,
      openCodePath: null,
      workspaceSkillsPath: null,
    },
    buildCommand: 'pnpm build',
    collection: 'direct',
    detectedBy: 'files',
    detailLevel: 'detail',
    diagnosticsFreshness: 'fresh',
    dependencies: {
      installPath: null,
      reason: 'ready',
      state: 'ready',
    },
    designPath: null,
    devCommand: 'pnpm dev',
    externalUrl: null,
    failureReport: null,
    git: {
      branch: 'main',
      hasGit: true,
      remoteUrl: null,
      state: 'clean',
      summary: 'clean',
      visibility: 'local-only',
      visibilitySource: 'none',
    },
    hasManifest: false,
    hasSavedMetadata: false,
    health: {
      checkedAt: null,
      httpStatus: 200,
      state: 'healthy',
      url: 'http://127.0.0.1:4100',
    },
    healthcheckUrl: 'http://127.0.0.1:4100',
    install: {
      command: 'pnpm install',
      finishedAt: null,
      lastExitCode: null,
      lastSignal: null,
      logTail: [],
      message: null,
      startedAt: null,
      status: 'idle',
      updatedAt: null,
    },
    installCommand: 'pnpm install',
    isPinned: false,
    location: 'direct',
    manifestPath: null,
    metadataUpdatedAt: null,
    name: 'Workspace Hub',
    notes: '',
    packageManager: 'pnpm',
    path: '/tmp/workspace/repos/workspace-hub',
    preferredMode: 'direct',
    previewCommand: null,
    previewUrl: 'http://127.0.0.1:4100',
    previewUrlSource: 'inferred',
    readmePath: '/tmp/workspace/repos/workspace-hub/README.md',
    recent: {
      lastActionAt: null,
      lastActionKind: null,
      lastOpenedAt: null,
      lastSelectedAt: null,
    },
    recommendedPreset: {
      id: 'node-pnpm-direct',
      label: 'Node direct',
      rationale: 'Node repos usually run directly.',
    },
    relativePath: 'repos/workspace-hub',
    runtime: {
      command: 'pnpm dev',
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
    savedMetadata: null,
    servbayPath: null,
    servbaySubdomain: null,
    sideLoad,
    slug: 'workspace-hub',
    suggestedManifest: {
      name: 'Workspace Hub',
      preferredMode: 'direct',
      slug: 'workspace-hub',
      type: 'node-app',
    },
    tags: [],
    type: 'node-app',
  }
}

function renderRepoDetails(repo: WorkspaceRepo, intakeResult: RepoIntakeResult | null = null) {
  return renderToStaticMarkup(
    React.createElement(RepoDetails, {
      actionError: null,
      actionPendingKey: null,
      embedded: true,
      intakeResult,
      loading: false,
      onApplyAgentPreset: async () => {},
      onCopyError: () => {},
      onCoverAction: async () => {},
      onInstallAction: async () => {},
      onIntakeAction: async () => {},
      onOpenAction: async () => {},
      onOpenWorkspacePath: async () => {},
      onResetMetadata: async () => {},
      onRuntimeAction: async () => {},
      onSaveMetadata: async () => {},
      onWriteManifest: async () => {},
      repo,
    }),
  )
}

test('RepoDetails renders the context cache block when side-load metadata is present', () => {
  const markup = renderRepoDetails(
    buildRepo({
      generatedAt: '2026-04-10T10:30:00Z',
      inputCount: 3,
      outputs: [
        {
          path: '/tmp/workspace/cache/context/repos/workspace-hub/abstract.md',
          relativePath: 'cache/context/repos/workspace-hub/abstract.md',
          role: 'abstract',
        },
        {
          path: '/tmp/workspace/cache/context/repos/workspace-hub/entry.md',
          relativePath: 'cache/context/repos/workspace-hub/entry.md',
          role: 'entry',
        },
        {
          path: '/tmp/workspace/cache/context/repos/workspace-hub/overview.md',
          relativePath: 'cache/context/repos/workspace-hub/overview.md',
          role: 'overview',
        },
        {
          path: '/tmp/workspace/cache/context/repos/workspace-hub/sources.json',
          relativePath: 'cache/context/repos/workspace-hub/sources.json',
          role: 'sources',
        },
      ],
      status: 'fresh',
    }),
  )

  assert.match(markup, /Context cache/)
  assert.match(markup, /Open entry packet/)
  assert.match(markup, /Open abstract/)
  assert.match(markup, /cache\/context\/repos\/workspace-hub\/sources\.json/)
})

test('RepoDetails omits the context cache block when side-load metadata has not been hydrated yet', () => {
  const markup = renderRepoDetails(buildRepo(undefined))
  assert.doesNotMatch(markup, /Context cache/)
})

test('RepoDetails renders the latest repo intake notes and mapped-host warning when relevant', () => {
  const repo = buildRepo(undefined)
  repo.preferredMode = 'servbay'

  const markup = renderRepoDetails(repo, {
    coverCreated: true,
    coverImagePath: '/tmp/workspace/repos/workspace-hub/docs/cover.png',
    manifestCreated: true,
    manifestPath: '/tmp/workspace/repos/workspace-hub/.workspace/project.json',
    notes: ['Manifest created because this repo benefits from explicit runtime metadata.'],
    readmeCreated: false,
    readmePath: '/tmp/workspace/repos/workspace-hub/README.md',
    readmeUpdated: true,
  })

  assert.match(markup, /Latest repo intake/)
  assert.match(markup, /Manifest created because this repo benefits from explicit runtime metadata\./)
  assert.match(markup, /Mapped-host mode is selected, but no path or subdomain is configured yet\./)
})
