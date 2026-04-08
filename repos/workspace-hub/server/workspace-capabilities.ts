import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type {
  WorkspaceCapability,
  WorkspaceCapabilityActionId,
  WorkspaceCapabilitiesSnapshot,
} from '../src/types/workspace.ts'

type CapabilityManifest = {
  capabilities?: Array<{
    category?: string
    classification?: WorkspaceCapability['classification']
    description?: string
    docsPath?: string
    enabledByDefault?: boolean
    exposeInHub?: boolean
    id?: string
    installMethod?: WorkspaceCapability['installMethod']
    installTarget?: string
    name?: string
    notes?: string
    repoUsageNotes?: string
    sourceUrl?: string
    uninstallPolicy?: string
    updateStrategy?: string
  }>
}

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

export async function readWorkspaceCapabilities() {
  const [manifest, state] = await Promise.all([readManifest(), readState()])
  const capabilities: WorkspaceCapability[] = []

  for (const capabilityConfig of manifest.capabilities ?? []) {
    const id = capabilityConfig.id?.trim()
    const name = capabilityConfig.name?.trim()
    const classification = capabilityConfig.classification
    const installMethod = capabilityConfig.installMethod
    const installTarget = capabilityConfig.installTarget?.trim()
    const sourceUrl = capabilityConfig.sourceUrl?.trim()

    if (!id || !name || !classification || !installMethod || !installTarget || !sourceUrl) {
      continue
    }

    const installPath = path.join(workspaceRoot, installTarget)
    const docsPath = capabilityConfig.docsPath
      ? path.join(workspaceRoot, capabilityConfig.docsPath)
      : null
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

  return capabilities
}

export function summarizeWorkspaceCapabilities(capabilities: WorkspaceCapability[]) {
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
    referenceOnly: capabilities.filter((capability) => capability.classification === 'reference-only')
      .length,
    total: capabilities.length,
  } satisfies WorkspaceCapabilitiesSnapshot['stats']
}

export async function buildWorkspaceCapabilitiesSnapshot() {
  const capabilities = await readWorkspaceCapabilities()

  return {
    capabilities,
    generatedAt: new Date().toISOString(),
    stats: summarizeWorkspaceCapabilities(capabilities),
  } satisfies WorkspaceCapabilitiesSnapshot
}

export async function findWorkspaceCapability(capabilityId: string) {
  const capabilities = await readWorkspaceCapabilities()
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
