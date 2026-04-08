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
    referenceOnly: 1,
    total: 3,
  })
})
