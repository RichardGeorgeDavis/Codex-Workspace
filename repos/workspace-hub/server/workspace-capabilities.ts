import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type {
  WorkspaceCapability,
  WorkspaceCapabilityActionId,
  WorkspaceCapabilityManifestIssue,
  WorkspaceCapabilitiesSnapshot,
} from '../src/types/workspace.ts'
import {
  resolveWorkspaceCommand,
  resolveWorkspaceCommandList,
  resolveWorkspacePath,
} from './workspace-manifest-utils.ts'

type CapabilityManifest = {
  capabilities?: Array<{
    category?: string
    classification?: WorkspaceCapability['classification']
    description?: string
    docsPath?: string
    enabledByDefault?: boolean
    exposeInHub?: boolean
    id?: string
    installCommand?: unknown
    installMethod?: WorkspaceCapability['installMethod']
    installTarget?: string
    name?: string
    notes?: string
    postInstallCommands?: unknown
    repoUsageNotes?: string
    sourceUrl?: string
    syncCommand?: unknown
    uninstallPolicy?: string
    updateStrategy?: string
  }>
}

type CapabilityManifestEntry = NonNullable<CapabilityManifest['capabilities']>[number]

type CapabilityState = {
  capabilities?: Record<
    string,
    {
      enabled?: boolean
      updatedAt?: string
    }
  >
}

const execFileAsync = promisify(execFile)
const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const manifestPath = path.join(workspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')
const statePath = path.join(workspaceRoot, 'shared', 'workspace-capabilities', 'state.json')
const capabilityScriptPath = path.join(workspaceRoot, 'tools', 'scripts', 'manage-workspace-capabilities.sh')
const loggedManifestIssueKeys = new Set<string>()
let lastCapabilityManifestValidationAt: string | null = null
let lastCapabilityManifestIssues: WorkspaceCapabilityManifestIssue[] = []
let capabilityManifestLoggedWarnings = 0

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readManifest() {
  if (!(await fileExists(manifestPath))) {
    return { capabilities: [] } satisfies CapabilityManifest
  }

  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as CapabilityManifest
  } catch {
    return { capabilities: [] } satisfies CapabilityManifest
  }
}

async function readState() {
  if (!(await fileExists(statePath))) {
    return { capabilities: {} } satisfies CapabilityState
  }

  try {
    return JSON.parse(await readFile(statePath, 'utf8')) as CapabilityState
  } catch {
    return { capabilities: {} } satisfies CapabilityState
  }
}

function resolveCapabilityEnabled(
  capabilityId: string,
  enabledByDefault: boolean,
  state: CapabilityState,
) {
  const storedValue = state.capabilities?.[capabilityId]?.enabled
  return typeof storedValue === 'boolean' ? storedValue : enabledByDefault
}

function buildCapabilityManifestIssue(
  capabilityConfig: CapabilityManifestEntry | undefined,
  reason: string,
  remediation: string,
): WorkspaceCapabilityManifestIssue {
  const capabilityId = capabilityConfig?.id?.trim() ?? null
  const capabilityName = capabilityConfig?.name?.trim() ?? null

  return {
    capabilityId,
    capabilityName,
    remediation,
    reason,
  }
}

function logCapabilityManifestIssue(issue: WorkspaceCapabilityManifestIssue) {
  const issueKey = `${issue.capabilityId ?? 'unknown-id'}|${issue.capabilityName ?? 'unknown-name'}|${issue.reason}`

  if (loggedManifestIssueKeys.has(issueKey)) {
    return
  }

  loggedManifestIssueKeys.add(issueKey)
  capabilityManifestLoggedWarnings += 1
  console.warn(
    `[workspace-capabilities] Skipping manifest entry${issue.capabilityId ? ` ${issue.capabilityId}` : ''}: ${issue.reason}`,
  )
}

export async function readWorkspaceCapabilities() {
  const [manifest, state] = await Promise.all([readManifest(), readState()])
  const capabilities: WorkspaceCapability[] = []
  const manifestIssues: WorkspaceCapabilityManifestIssue[] = []

  for (const capabilityConfig of manifest.capabilities ?? []) {
    const id = capabilityConfig.id?.trim()
    const name = capabilityConfig.name?.trim()
    const classification = capabilityConfig.classification
    const installMethod = capabilityConfig.installMethod
    const installPath = resolveWorkspacePath(workspaceRoot, capabilityConfig.installTarget)
    const sourceUrl = capabilityConfig.sourceUrl?.trim()
    const docsPath = resolveWorkspacePath(workspaceRoot, capabilityConfig.docsPath)
    const installCommand = resolveWorkspaceCommand(workspaceRoot, capabilityConfig.installCommand)
    const syncCommand = resolveWorkspaceCommand(workspaceRoot, capabilityConfig.syncCommand)
    const postInstallCommands = resolveWorkspaceCommandList(
      workspaceRoot,
      capabilityConfig.postInstallCommands,
    )

    if (!id) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required capability id.',
          'Add a unique `id` string to the manifest entry.',
        ),
      )
      continue
    }

    if (!name) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required capability name.',
          'Add a human-readable `name` for the manifest entry.',
        ),
      )
      continue
    }

    if (!classification) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required capability classification.',
          'Set `classification` to a supported value such as `ability`, `core-service`, or `reference-only`.',
        ),
      )
      continue
    }

    if (!installMethod) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required install method.',
          'Set `installMethod` to the reviewed install flow for this entry.',
        ),
      )
      continue
    }

    if (!capabilityConfig.installTarget?.trim()) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required install target.',
          'Set `installTarget` to a workspace-relative path under the workspace root.',
        ),
      )
      continue
    }

    if (!installPath) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Install target resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `installTarget` that stays under the workspace root.',
        ),
      )
      continue
    }

    if (!sourceUrl) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Missing required source URL.',
          'Add `sourceUrl` so the workspace can trace the reviewed upstream source.',
        ),
      )
      continue
    }

    if (capabilityConfig.docsPath?.trim() && !docsPath) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Docs path resolves outside the workspace root and was rejected.',
          'Use a workspace-relative `docsPath` that stays under the workspace root.',
        ),
      )
      continue
    }

    if (capabilityConfig.installCommand !== undefined && !installCommand) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Install command must be a non-empty workspace-local argv array.',
          'Convert `installCommand` to a JSON string array such as `["tools/bin/example", "install"]`.',
        ),
      )
      continue
    }

    if (capabilityConfig.syncCommand !== undefined && !syncCommand) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Sync command must be a non-empty workspace-local argv array.',
          'Convert `syncCommand` to a JSON string array rooted in the workspace.',
        ),
      )
      continue
    }

    if (capabilityConfig.postInstallCommands !== undefined && postInstallCommands === null) {
      manifestIssues.push(
        buildCapabilityManifestIssue(
          capabilityConfig,
          'Post-install commands must be an array of workspace-local argv arrays.',
          'Convert each `postInstallCommands` entry to a JSON string array rooted in the workspace.',
        ),
      )
      continue
    }

    const installTarget = path.relative(workspaceRoot, installPath).split(path.sep).join('/')
    const readmePath = path.join(installPath, 'README.md')

    capabilities.push({
      category: capabilityConfig.category?.trim() ?? 'workspace',
      classification,
      description: capabilityConfig.description?.trim() ?? '',
      docsPath: docsPath && (await fileExists(docsPath)) ? docsPath : null,
      enabled: resolveCapabilityEnabled(id, capabilityConfig.enabledByDefault ?? false, state),
      enabledByDefault: capabilityConfig.enabledByDefault ?? false,
      exposeInHub: capabilityConfig.exposeInHub ?? false,
      id,
      installMethod,
      installPath,
      installTarget,
      installed: await fileExists(installPath),
      name,
      notes: capabilityConfig.notes?.trim() ?? '',
      readmePath: await fileExists(readmePath) ? readmePath : null,
      repoUsageNotes: capabilityConfig.repoUsageNotes?.trim() ?? '',
      sourceUrl,
      uninstallPolicy: capabilityConfig.uninstallPolicy?.trim() ?? '',
      updatedAt: state.capabilities?.[id]?.updatedAt?.trim() ?? null,
      updateStrategy: capabilityConfig.updateStrategy?.trim() ?? '',
    })
  }

  lastCapabilityManifestValidationAt = new Date().toISOString()
  lastCapabilityManifestIssues = manifestIssues

  for (const issue of manifestIssues) {
    logCapabilityManifestIssue(issue)
  }

  return {
    capabilities,
    manifestIssues,
  }
}

export function summarizeWorkspaceCapabilities(
  capabilities: WorkspaceCapability[],
  manifestIssues: WorkspaceCapabilityManifestIssue[] = [],
) {
  return {
    abilities: capabilities.filter((capability) => capability.classification === 'ability').length,
    coreServices: capabilities.filter((capability) => capability.classification === 'core-service')
      .length,
    disabled: capabilities.filter((capability) => !capability.enabled).length,
    enabled: capabilities.filter((capability) => capability.enabled).length,
    exposedInHub: capabilities.filter((capability) => capability.exposeInHub).length,
    installed: capabilities.filter((capability) => capability.installed).length,
    installable: capabilities.filter(
      (capability) =>
        capability.classification === 'ability' || capability.classification === 'core-service',
      ).length,
    notInstalled: capabilities.filter((capability) => !capability.installed).length,
    rejectedEntries: manifestIssues.length,
    referenceOnly: capabilities.filter((capability) => capability.classification === 'reference-only')
      .length,
    total: capabilities.length,
  } satisfies WorkspaceCapabilitiesSnapshot['stats']
}

export function getWorkspaceCapabilitiesObservability() {
  const manifestIssueReasons = Object.entries(
    lastCapabilityManifestIssues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.reason] = (counts[issue.reason] ?? 0) + 1
      return counts
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right))

  return {
    lastValidatedAt: lastCapabilityManifestValidationAt,
    loggedWarnings: capabilityManifestLoggedWarnings,
    manifestIssueReasons: Object.fromEntries(manifestIssueReasons),
    rejectedEntries: lastCapabilityManifestIssues.length,
  }
}

export async function buildWorkspaceCapabilitiesSnapshot() {
  const { capabilities, manifestIssues } = await readWorkspaceCapabilities()

  return {
    capabilities,
    generatedAt: new Date().toISOString(),
    manifestIssues,
    stats: summarizeWorkspaceCapabilities(capabilities, manifestIssues),
  } satisfies WorkspaceCapabilitiesSnapshot
}

export async function findWorkspaceCapability(capabilityId: string) {
  const { capabilities } = await readWorkspaceCapabilities()
  return capabilities.find((capability) => capability.id === capabilityId) ?? null
}

export async function runWorkspaceCapabilityAction(
  action: WorkspaceCapabilityActionId,
  capabilityId: string,
) {
  const { stdout, stderr } = await execFileAsync(
    capabilityScriptPath,
    [action, '--run', capabilityId],
    {
      cwd: workspaceRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: 240000,
    },
  )

  return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
}
