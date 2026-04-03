import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'

type AgentToolingModule = typeof import('../server/agent-tooling.ts')
type WorkspaceModule = typeof import('../server/workspace.ts')

let tempWorkspaceRoot = ''
let agentToolingModule: AgentToolingModule
let workspaceModule: WorkspaceModule

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

async function setupWorkspaceFixture(root: string) {
  for (const directory of [
    'cache',
    'docs',
    'repos',
    'shared',
    'shared/skills/repo-onboarding',
    'shared/skills/workspace-maintenance',
    'tools/templates/agents-md',
    'tools/templates/codex',
    'tools/templates/opencode',
  ]) {
    await mkdir(path.join(root, directory), { recursive: true })
  }

  await writeTextFile(path.join(root, 'AGENTS.md'), '# Workspace Instructions\n')
  await writeTextFile(path.join(root, 'shared', 'standards.md'), '# Standards\n')
  await writeTextFile(
    path.join(root, 'shared', 'skills', 'repo-onboarding', 'SKILL.md'),
    '# Repo Onboarding\n',
  )
  await writeTextFile(
    path.join(root, 'shared', 'skills', 'workspace-maintenance', 'SKILL.md'),
    '# Workspace Maintenance\n',
  )
  await writeTextFile(
    path.join(root, 'tools', 'templates', 'agents-md', 'repo.agents.template.md'),
    [
      '# AGENTS.md',
      '',
      '## Scope',
      '',
      'These instructions apply to `__TITLE__` at `__RELATIVE_PATH__`.',
      '',
      '## Defaults',
      '',
      '- keep changes reviewable',
      '',
    ].join('\n'),
  )
  await writeTextFile(
    path.join(root, 'tools', 'templates', 'codex', 'README.md'),
    '# Codex Setup\n',
  )
  await writeTextFile(
    path.join(root, 'tools', 'templates', 'codex', 'codex.project.example.toml'),
    '# Project-level Codex config placeholder.\n',
  )
  await writeTextFile(
    path.join(root, 'tools', 'templates', 'opencode', 'README.md'),
    '# OpenCode Setup\n',
  )
  await writeTextFile(
    path.join(root, 'tools', 'templates', 'opencode', 'opencode.project.example.jsonc'),
    '{\n  "plugins": []\n}\n',
  )
  await writeTextFile(
    path.join(
      root,
      'tools',
      'templates',
      'opencode',
      'oh-my-openagent.project.example.jsonc',
    ),
    '{\n  "runtime": "oh-my-openagent"\n}\n',
  )
}

async function loadServerModules(root: string) {
  process.env.WORKSPACE_HUB_WORKSPACE_ROOT = root
  const cacheBuster = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  agentToolingModule = (await import(
    new URL(`../server/agent-tooling.ts?test=${cacheBuster}`, import.meta.url).href
  )) as AgentToolingModule
  workspaceModule = (await import(
    new URL(`../server/workspace.ts?test=${cacheBuster}`, import.meta.url).href
  )) as WorkspaceModule
}

async function createRepo(relativePath: string) {
  const repoRoot = path.join(tempWorkspaceRoot, 'repos', relativePath)
  await writeTextFile(
    path.join(repoRoot, 'package.json'),
    `{\n  "name": "${relativePath}"\n}\n`,
  )
  return repoRoot
}

before(async () => {
  tempWorkspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), 'codex-workspace-hub-agent-tooling-'),
  )
  await setupWorkspaceFixture(tempWorkspaceRoot)
  await loadServerModules(tempWorkspaceRoot)
})

after(async () => {
  delete process.env.WORKSPACE_HUB_WORKSPACE_ROOT
  if (tempWorkspaceRoot) {
    await rm(tempWorkspaceRoot, { force: true, recursive: true })
  }
})

test('detects repo-local codex, compatibility, and opencode surfaces from a discovered repo', async () => {
  const relativePath = 'fixture-detection'
  const repoRoot = await createRepo(relativePath)

  await writeTextFile(path.join(repoRoot, 'README.md'), '# Fixture Detection\n')
  await writeTextFile(path.join(repoRoot, 'AGENTS.md'), '# Repo Agent Rules\n')
  await writeTextFile(path.join(repoRoot, '.codex', 'config.toml'), 'model = "gpt-5"\n')
  await writeTextFile(
    path.join(repoRoot, '.codex', 'skills', 'repo-runbook', 'SKILL.md'),
    '# Codex Skill\n',
  )
  await writeTextFile(
    path.join(repoRoot, '.agents', 'skills', 'repo-runbook', 'SKILL.md'),
    '# Compatibility Skill\n',
  )
  await writeTextFile(
    path.join(repoRoot, '.workspace', 'skills', 'portable', 'SKILL.md'),
    '# Portable Skill\n',
  )
  await writeTextFile(
    path.join(repoRoot, '.workspace', 'agent-stack.json'),
    '{\n  "version": 1\n}\n',
  )
  await writeTextFile(
    path.join(repoRoot, '.opencode', 'opencode.jsonc'),
    '{\n  "plugins": []\n}\n',
  )
  await writeTextFile(
    path.join(repoRoot, '.opencode', 'oh-my-openagent.jsonc'),
    '{\n  "runtime": "oh-my-openagent"\n}\n',
  )
  await writeTextFile(path.join(repoRoot, '.omx', 'state', 'status.json'), '{}\n')

  const summary = await workspaceModule.buildWorkspaceSummary(4101, new Map(), new Map())
  const repo = summary.repos.find((entry) => entry.path === repoRoot)

  assert.ok(repo)
  assert.equal(repo.relativePath, `repos/${relativePath}`)
  assert.equal(repo.agentTooling.agentsPath, 'AGENTS.md')
  assert.equal(repo.agentTooling.agentStackPath, '.workspace/agent-stack.json')
  assert.equal(repo.agentTooling.codexProjectConfigPath, '.codex/config.toml')
  assert.equal(repo.agentTooling.codexProjectSkillsPath, '.codex/skills')
  assert.equal(repo.agentTooling.codexSkillsPath, '.agents/skills')
  assert.equal(repo.agentTooling.workspaceSkillsPath, '.workspace/skills')
  assert.equal(repo.agentTooling.openCodePath, '.opencode/opencode.jsonc')
  assert.equal(
    repo.agentTooling.openAgentConfigPath,
    '.opencode/oh-my-openagent.jsonc',
  )
  assert.equal(repo.agentTooling.omxPath, '.omx/state')
})

test('codex-baseline preset scaffolds official codex files and compatibility mirrors without agent-stack churn', async () => {
  const relativePath = 'fixture-codex-baseline'
  const repoRoot = await createRepo(relativePath)

  const result = await agentToolingModule.applyRepoAgentPreset(
    repoRoot,
    relativePath,
    'Fixture Codex Baseline',
    'codex-baseline',
  )

  assert.ok(await pathExists(path.join(repoRoot, 'AGENTS.md')))
  assert.ok(await pathExists(path.join(repoRoot, '.codex', 'README.md')))
  assert.ok(await pathExists(path.join(repoRoot, '.codex', 'config.toml')))
  assert.ok(
    await pathExists(
      path.join(repoRoot, '.codex', 'skills', 'workspace-maintenance', 'SKILL.md'),
    ),
  )
  assert.ok(
    await pathExists(
      path.join(repoRoot, '.agents', 'skills', 'workspace-maintenance', 'SKILL.md'),
    ),
  )
  assert.equal(await pathExists(path.join(repoRoot, '.workspace', 'agent-stack.json')), false)
  assert.ok(
    result.appliedFiles.some((entry) =>
      entry.endsWith(`${relativePath}/.codex/config.toml`),
    ),
  )
})

test('all-in-one preset preserves existing repo files while adding tracked agent setup files', async () => {
  const relativePath = 'fixture-all-in-one'
  const repoRoot = await createRepo(relativePath)
  const existingAgents = '# Existing Agent Rules\n'
  const existingCodexConfig = '# Keep this config\n'

  await writeTextFile(path.join(repoRoot, 'AGENTS.md'), existingAgents)
  await writeTextFile(path.join(repoRoot, '.codex', 'config.toml'), existingCodexConfig)

  const result = await agentToolingModule.applyRepoAgentPreset(
    repoRoot,
    relativePath,
    'Fixture All In One',
    'all-in-one',
  )

  assert.equal(await readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8'), existingAgents)
  assert.equal(
    await readFile(path.join(repoRoot, '.codex', 'config.toml'), 'utf8'),
    existingCodexConfig,
  )
  assert.ok(await pathExists(path.join(repoRoot, '.workspace', 'agent-stack.json')))
  assert.ok(await pathExists(path.join(repoRoot, '.opencode', 'opencode.jsonc')))
  assert.ok(
    await pathExists(path.join(repoRoot, '.opencode', 'oh-my-openagent.jsonc')),
  )

  const agentStack = JSON.parse(
    await readFile(path.join(repoRoot, '.workspace', 'agent-stack.json'), 'utf8'),
  ) as {
    codex: {
      compatibilitySkillsPath: string
      officialConfigFile: string
      officialSkillsPath: string
    }
    opencode: {
      configDir: string
      runtimeConfig: string
    }
  }

  assert.equal(agentStack.codex.officialConfigFile, '.codex/config.toml')
  assert.equal(agentStack.codex.officialSkillsPath, '.codex/skills')
  assert.equal(agentStack.codex.compatibilitySkillsPath, '.agents/skills')
  assert.equal(agentStack.opencode.configDir, '.opencode')
  assert.equal(agentStack.opencode.runtimeConfig, 'oh-my-openagent.jsonc')
  assert.ok(
    result.skippedFiles.some((entry) => entry.endsWith(`${relativePath}/AGENTS.md`)),
  )
  assert.ok(
    result.notes.some((entry) => entry.includes('Existing repo files were preserved.')),
  )
})
