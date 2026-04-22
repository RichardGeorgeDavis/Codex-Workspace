import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { promisify } from 'node:util'
import { summarizeWorkspaceCapabilities } from '../server/workspace-capabilities.ts'

const execFileAsync = promisify(execFile)
const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const capabilityScriptPath = path.join(
  workspaceRoot,
  'tools',
  'scripts',
  'manage-workspace-capabilities.sh',
)

let tempWorkspaceRoot = ''
let tempRemoteRoot = ''

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function writeTextFile(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

async function ensureInstallHookScript(root: string) {
  const installHookPath = path.join(root, 'tools', 'scripts', 'test-install-hook.sh')

  await writeTextFile(
    installHookPath,
    `#!/usr/bin/env sh
set -eu
workspace_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
mkdir -p "$workspace_root/cache/helper-skill"
printf 'ok\n' >"$workspace_root/cache/helper-skill/hook-ran.txt"
`,
  )
  await execFileAsync('chmod', ['755', installHookPath], { cwd: root })
}

async function runCapabilityScript(
  args: string[],
  manifestPath: string,
  statePath: string,
) {
  return execFileAsync(capabilityScriptPath, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      WORKSPACE_CAPABILITIES_MANIFEST: manifestPath,
      WORKSPACE_CAPABILITIES_STATE_PATH: statePath,
      WORKSPACE_CAPABILITIES_WORKSPACE_ROOT: tempWorkspaceRoot,
    },
  })
}

async function importWorkspaceCapabilitiesModule(root: string) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return await import(
    new URL(`../server/workspace-capabilities.ts?test=${cacheBuster}`, import.meta.url).href
  )
}

async function configureGitIdentity(cwd: string) {
  await execFileAsync('git', ['config', 'user.name', 'Workspace Hub Tests'], { cwd })
  await execFileAsync('git', ['config', 'user.email', 'workspace-hub-tests@example.com'], { cwd })
}

async function createRemoteRepo(name: string) {
  const remoteBarePath = path.join(tempRemoteRoot, `${name}.git`)
  const authorPath = path.join(tempRemoteRoot, `${name}-author`)

  await execFileAsync('git', ['init', '--bare', remoteBarePath])
  await mkdir(authorPath, { recursive: true })
  await execFileAsync('git', ['init'], { cwd: authorPath })
  await configureGitIdentity(authorPath)
  await writeTextFile(path.join(authorPath, 'README.md'), `# ${name}\n`)
  await execFileAsync('git', ['add', 'README.md'], { cwd: authorPath })
  await execFileAsync('git', ['commit', '-m', 'Initial commit'], { cwd: authorPath })
  await execFileAsync('git', ['branch', '-M', 'main'], { cwd: authorPath })
  await execFileAsync('git', ['remote', 'add', 'origin', remoteBarePath], { cwd: authorPath })
  await execFileAsync('git', ['push', '-u', 'origin', 'main'], { cwd: authorPath })

  return remoteBarePath
}

before(async () => {
  tempWorkspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codex-workspace-capabilities-'))
  tempRemoteRoot = await mkdtemp(path.join(os.tmpdir(), 'codex-workspace-capabilities-remote-'))

  for (const directory of ['cache', 'docs', 'repos', 'shared', 'tools/manifests']) {
    await mkdir(path.join(tempWorkspaceRoot, directory), { recursive: true })
  }
})

after(async () => {
  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT

  if (tempWorkspaceRoot) {
    await rm(tempWorkspaceRoot, { force: true, recursive: true })
  }

  if (tempRemoteRoot) {
    await rm(tempRemoteRoot, { force: true, recursive: true })
  }
})

test('workspace capability lifecycle supports list, install, enable, disable, update, and uninstall', async () => {
  const helperRemotePath = await createRemoteRepo('helper-skill')
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')
  const statePath = path.join(tempWorkspaceRoot, 'shared', 'workspace-capabilities', 'state.json')
  const disposablePath = 'cache/helper-skill/test-user'
  const hookMarkerPath = path.join(tempWorkspaceRoot, 'cache', 'helper-skill', 'hook-ran.txt')

  await ensureInstallHookScript(tempWorkspaceRoot)

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'helper-skill',
            name: 'Helper Skill',
            description: 'Test ability',
            classification: 'ability',
            sourceUrl: helperRemotePath,
            installTarget: 'repos/abilities/helper-skill',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
            installCommand: ['tools/scripts/test-install-hook.sh'],
            disposablePaths: [disposablePath],
          },
        ],
      },
      null,
      2,
    ),
  )

  const listResult = await runCapabilityScript(['list'], manifestPath, statePath)
  assert.match(listResult.stdout, /helper-skill\tability\tenabled=false\tinstalled=false/)

  await runCapabilityScript(['enable', '--run', 'helper-skill'], manifestPath, statePath)
  let state = JSON.parse(await readFile(statePath, 'utf8')) as {
    capabilities: Record<string, { enabled: boolean }>
  }
  assert.equal(state.capabilities['helper-skill']?.enabled, true)

  await runCapabilityScript(['install', '--run', 'helper-skill'], manifestPath, statePath)
  const installPath = path.join(tempWorkspaceRoot, 'repos', 'abilities', 'helper-skill')
  assert.equal(await pathExists(path.join(installPath, '.git')), true)
  assert.equal(await pathExists(hookMarkerPath), true)

  await writeTextFile(path.join(installPath, 'LOCAL_CHANGE.md'), 'dirty tree\n')
  const updateResult = await runCapabilityScript(['update', '--run', 'helper-skill'], manifestPath, statePath)
  assert.match(updateResult.stdout, /Skipping dirty working tree: helper-skill/)

  await runCapabilityScript(['disable', '--run', 'helper-skill'], manifestPath, statePath)
  state = JSON.parse(await readFile(statePath, 'utf8')) as {
    capabilities: Record<string, { enabled: boolean }>
  }
  assert.equal(state.capabilities['helper-skill']?.enabled, false)

  await writeTextFile(path.join(tempWorkspaceRoot, disposablePath, 'artifact.txt'), 'temporary\n')
  await runCapabilityScript(['uninstall', '--run', 'helper-skill'], manifestPath, statePath)

  assert.equal(await pathExists(installPath), false)
  assert.equal(await pathExists(path.join(tempWorkspaceRoot, disposablePath)), false)
})

test('workspace capability manager rejects paths that escape the workspace root', async () => {
  const helperRemotePath = await createRemoteRepo('outside-path')
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities-outside.json')
  const statePath = path.join(tempWorkspaceRoot, 'shared', 'workspace-capabilities', 'state-outside.json')

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'outside-path',
            name: 'Outside Path',
            description: 'Invalid install target',
            classification: 'ability',
            sourceUrl: helperRemotePath,
            installTarget: '../outside-root',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
          },
        ],
      },
      null,
      2,
    ),
  )

  await assert.rejects(
    runCapabilityScript(['install', '--run', 'outside-path'], manifestPath, statePath),
    /Capability installTarget must stay inside the workspace root\./,
  )
})

test('workspace capability manager rejects non-array manifest commands', async () => {
  const helperRemotePath = await createRemoteRepo('unsafe-command')
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities-unsafe.json')
  const statePath = path.join(tempWorkspaceRoot, 'shared', 'workspace-capabilities', 'state-unsafe.json')

  await ensureInstallHookScript(tempWorkspaceRoot)

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'unsafe-command',
            name: 'Unsafe Command',
            description: 'Invalid install command',
            classification: 'ability',
            sourceUrl: helperRemotePath,
            installTarget: 'repos/abilities/unsafe-command',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
            installCommand: 'tools/scripts/test-install-hook.sh && echo nope',
          },
        ],
      },
      null,
      2,
    ),
  )

  await assert.rejects(
    runCapabilityScript(['install', '--run', 'unsafe-command'], manifestPath, statePath),
    /Workspace capability commands must be non-empty JSON string arrays\./,
  )
})

test('workspace capability manager rejects disposable paths that escape the workspace root', async () => {
  const helperRemotePath = await createRemoteRepo('unsafe-disposable')
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities-disposable.json')
  const statePath = path.join(tempWorkspaceRoot, 'shared', 'workspace-capabilities', 'state-disposable.json')

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'unsafe-disposable',
            name: 'Unsafe Disposable',
            description: 'Invalid disposable path',
            classification: 'ability',
            sourceUrl: helperRemotePath,
            installTarget: 'repos/abilities/unsafe-disposable',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
            disposablePaths: ['../outside-cache'],
          },
        ],
      },
      null,
      2,
    ),
  )

  await assert.rejects(
    runCapabilityScript(['uninstall', '--run', 'unsafe-disposable'], manifestPath, statePath),
    /Capability disposable path must stay inside the workspace root\./,
  )
})

test('workspace capability reader skips manifest entries with install targets outside the workspace root', async () => {
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'safe-entry',
            name: 'Safe Entry',
            description: 'Valid',
            classification: 'ability',
            sourceUrl: 'https://example.com/safe.git',
            installTarget: 'repos/abilities/safe-entry',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
          },
          {
            id: 'unsafe-entry',
            name: 'Unsafe Entry',
            description: 'Invalid',
            classification: 'ability',
            sourceUrl: 'https://example.com/unsafe.git',
            installTarget: '../unsafe-entry',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
          },
        ],
      },
      null,
      2,
    ),
  )

  const capabilitiesModule = await importWorkspaceCapabilitiesModule(tempWorkspaceRoot)
  const result = await capabilitiesModule.readWorkspaceCapabilities()

  assert.deepEqual(result.capabilities.map((capability) => capability.id), ['safe-entry'])
  assert.equal(result.manifestIssues.length, 1)
  assert.match(result.manifestIssues[0]?.reason ?? '', /outside the workspace root/i)
  assert.match(result.manifestIssues[0]?.remediation ?? '', /workspace-relative `installTarget`/i)

  const snapshot = await capabilitiesModule.buildWorkspaceCapabilitiesSnapshot()
  assert.equal(snapshot.stats.rejectedEntries, 1)
  assert.equal(snapshot.manifestIssues.length, 1)

  const observability = capabilitiesModule.getWorkspaceCapabilitiesObservability()
  assert.equal(observability.rejectedEntries, 1)

  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT
})

test('workspace capability reader rejects docs paths that escape the workspace root', async () => {
  const helperRemotePath = await createRemoteRepo('outside-docs')
  const manifestPath = path.join(tempWorkspaceRoot, 'tools', 'manifests', 'workspace-capabilities.json')

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        capabilities: [
          {
            id: 'outside-docs',
            name: 'Outside Docs',
            description: 'Invalid docs path',
            classification: 'ability',
            sourceUrl: helperRemotePath,
            installTarget: 'repos/abilities/outside-docs',
            enabledByDefault: false,
            installMethod: 'git',
            updateStrategy: 'git-fast-forward',
            exposeInHub: true,
            docsPath: '../outside-docs.md',
          },
        ],
      },
      null,
      2,
    ),
  )

  const capabilitiesModule = await importWorkspaceCapabilitiesModule(tempWorkspaceRoot)
  const result = await capabilitiesModule.readWorkspaceCapabilities()

  assert.equal(result.capabilities.length, 0)
  assert.equal(result.manifestIssues.length, 1)
  assert.match(result.manifestIssues[0]?.reason ?? '', /docs path resolves outside the workspace root/i)
  assert.match(result.manifestIssues[0]?.remediation ?? '', /workspace-relative `docsPath`/i)

  const snapshot = await capabilitiesModule.buildWorkspaceCapabilitiesSnapshot()
  assert.equal(snapshot.stats.rejectedEntries, 1)
  assert.equal(snapshot.manifestIssues.length, 1)

  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT
})

test('workspace capability snapshot stats summarize operator state clearly', () => {
  const stats = summarizeWorkspaceCapabilities([
    {
      category: 'memory',
      classification: 'core-service',
      description: 'Memory service',
      docsPath: null,
      enabled: true,
      enabledByDefault: true,
      exposeInHub: true,
      id: 'mempalace',
      installMethod: 'git',
      installPath: '/tmp/tools/mempalace',
      installTarget: 'tools/mempalace',
      installed: true,
      name: 'MemPalace',
      notes: '',
      readmePath: null,
      repoUsageNotes: '',
      sourceUrl: 'https://example.com/mempalace.git',
      uninstallPolicy: '',
      updatedAt: '2026-04-08T10:00:00.000Z',
      updateStrategy: 'git-sync-command',
    },
    {
      category: 'design-reference',
      classification: 'ability',
      description: 'Design helper',
      docsPath: null,
      enabled: false,
      enabledByDefault: false,
      exposeInHub: true,
      id: 'design-md',
      installMethod: 'git',
      installPath: '/tmp/repos/abilities/design-md',
      installTarget: 'repos/abilities/design-md',
      installed: true,
      name: 'Design MD',
      notes: '',
      readmePath: null,
      repoUsageNotes: '',
      sourceUrl: 'https://example.com/design-md.git',
      uninstallPolicy: '',
      updatedAt: null,
      updateStrategy: 'git-fast-forward',
    },
    {
      category: 'skill-catalog',
      classification: 'reference-only',
      description: 'Reference',
      docsPath: null,
      enabled: false,
      enabledByDefault: false,
      exposeInHub: false,
      id: 'openai-skills',
      installMethod: 'snapshot',
      installPath: '/tmp/tools/ref/openai-skills-main',
      installTarget: 'tools/ref/openai-skills-main',
      installed: false,
      name: 'openai/skills',
      notes: '',
      readmePath: null,
      repoUsageNotes: '',
      sourceUrl: 'https://example.com/openai-skills.tar.gz',
      uninstallPolicy: '',
      updatedAt: null,
      updateStrategy: 'archive-snapshot',
    },
  ], [
    {
      capabilityId: 'bad-entry',
      capabilityName: 'Bad Entry',
      reason: 'Install target resolves outside the workspace root and was rejected.',
      remediation: 'Use a workspace-relative `installTarget` under the workspace root.',
    },
  ])

  assert.deepEqual(stats, {
    abilities: 1,
    coreServices: 1,
    disabled: 2,
    enabled: 1,
    exposedInHub: 2,
    installed: 2,
    installable: 2,
    notInstalled: 1,
    rejectedEntries: 1,
    referenceOnly: 1,
    total: 3,
  })
})
