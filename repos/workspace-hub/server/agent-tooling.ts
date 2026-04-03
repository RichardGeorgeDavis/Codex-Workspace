import { execFile } from 'node:child_process'
import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type {
  RepoAgentPresetId,
  RepoAgentPresetResult,
  WorkspaceAgentCommand,
  WorkspaceAgentEnvironment,
} from '../src/types/workspace.ts'

const serverFile = fileURLToPath(import.meta.url)
const serverDir = path.dirname(serverFile)
const appRoot = path.resolve(serverDir, '..')
const configuredWorkspaceRoot = process.env.WORKSPACE_HUB_WORKSPACE_ROOT?.trim()
const workspaceRoot = configuredWorkspaceRoot
  ? path.resolve(configuredWorkspaceRoot)
  : path.resolve(appRoot, '..', '..')
const sharedSkillsRoot = path.join(workspaceRoot, 'shared', 'skills')
const agentsTemplateDir = path.join(workspaceRoot, 'tools', 'templates', 'agents-md')
const repoAgentsTemplatePath = path.join(agentsTemplateDir, 'repo.agents.template.md')
const codexTemplateDir = path.join(workspaceRoot, 'tools', 'templates', 'codex')
const codexReadmeTemplatePath = path.join(codexTemplateDir, 'README.md')
const codexProjectConfigTemplatePath = path.join(
  codexTemplateDir,
  'codex.project.example.toml',
)
const opencodeTemplateDir = path.join(workspaceRoot, 'tools', 'templates', 'opencode')
const opencodeReadmeTemplatePath = path.join(opencodeTemplateDir, 'README.md')
const opencodeProjectTemplatePath = path.join(
  opencodeTemplateDir,
  'opencode.project.example.jsonc',
)
const openAgentProjectTemplatePath = path.join(
  opencodeTemplateDir,
  'oh-my-openagent.project.example.jsonc',
)
const initAgentsTreePath = path.join(workspaceRoot, 'tools', 'scripts', 'init-agents-tree.sh')
const agentDoctorPath = path.join(
  workspaceRoot,
  'tools',
  'scripts',
  'doctor-agent-tooling.sh',
)
const agentPresetIds: RepoAgentPresetId[] = [
  'all-in-one',
  'codex-baseline',
  'omx-ready',
  'opencode',
]
const referencePolicy =
  'tools/ref is temporary reviewed references for extracting base upgrades into tracked workspace code, docs, templates, and skills'
const environmentCacheTtlMs = 60_000
const execFileAsync = promisify(execFile)

let cachedEnvironment:
  | {
      expiresAt: number
      value: WorkspaceAgentEnvironment
    }
  | null = null

function toWorkspaceRelative(targetPath: string) {
  return path.relative(workspaceRoot, targetPath).split(path.sep).join('/')
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readTextIfPresent(targetPath: string) {
  if (!(await pathExists(targetPath))) {
    return null
  }

  return readFile(targetPath, 'utf8')
}

function renderTemplate(template: string, replacements: Record<string, string>) {
  let rendered = template

  for (const [token, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(token, value)
  }

  return rendered
}

async function ensureParentDirectory(targetPath: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
}

async function createFileIfMissing(
  targetPath: string,
  content: string,
  result: RepoAgentPresetResult,
) {
  if (await pathExists(targetPath)) {
    result.skippedFiles.push(toWorkspaceRelative(targetPath))
    return false
  }

  await ensureParentDirectory(targetPath)
  await writeFile(targetPath, content, 'utf8')
  result.appliedFiles.push(toWorkspaceRelative(targetPath))
  return true
}

async function copyDirectoryMissingFiles(
  sourceDirectory: string,
  targetDirectory: string,
  result: RepoAgentPresetResult,
) {
  if (!(await pathExists(sourceDirectory))) {
    return
  }

  const entries = await readdir(sourceDirectory, { withFileTypes: true })
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of sortedEntries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const sourcePath = path.join(sourceDirectory, entry.name)
    const targetPath = path.join(targetDirectory, entry.name)

    if (entry.isDirectory()) {
      await copyDirectoryMissingFiles(sourcePath, targetPath, result)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (await pathExists(targetPath)) {
      result.skippedFiles.push(toWorkspaceRelative(targetPath))
      continue
    }

    await ensureParentDirectory(targetPath)
    await copyFile(sourcePath, targetPath)
    result.appliedFiles.push(toWorkspaceRelative(targetPath))
  }
}

async function countSkillFiles(rootPath: string): Promise<number> {
  if (!(await pathExists(rootPath))) {
    return 0
  }

  const entries = await readdir(rootPath, { withFileTypes: true })
  let count = 0

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const entryPath = path.join(rootPath, entry.name)

    if (entry.isDirectory()) {
      count += await countSkillFiles(entryPath)
      continue
    }

    if (entry.isFile() && entry.name === 'SKILL.md') {
      count += 1
    }
  }

  return count
}

async function resolveExistingAbsolutePath(candidates: string[]) {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate
    }
  }

  return null
}

async function readCommandPath(command: string) {
  try {
    const { stdout } = await execFileAsync('which', [command])
    const resolvedPath = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    return resolvedPath ?? null
  } catch {
    return null
  }
}

async function readCommandVersion(commandPath: string) {
  try {
    const { stdout, stderr } = await execFileAsync(commandPath, ['--version'])
    const versionLine = `${stdout}\n${stderr}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    return versionLine ?? null
  } catch {
    return null
  }
}

async function readWorkspaceCommand(command: string): Promise<WorkspaceAgentCommand> {
  const commandPath = await readCommandPath(command)

  if (!commandPath) {
    return {
      available: false,
      path: null,
      version: null,
    }
  }

  return {
    available: true,
    path: commandPath,
    version: await readCommandVersion(commandPath),
  }
}

async function buildWorkspaceAgentEnvironment(): Promise<WorkspaceAgentEnvironment> {
  const homeDirectory = homedir()
  const [codex, omx, opencode, bun, sharedSkillsCount, userCodexConfigPath, userOpenCodeConfigPath, userOpenAgentConfigPath, hasAgentsTemplateDir, hasCodexTemplateDir, hasOpencodeTemplateDir] =
    await Promise.all([
      readWorkspaceCommand('codex'),
      readWorkspaceCommand('omx'),
      readWorkspaceCommand('opencode'),
      readWorkspaceCommand('bun'),
      countSkillFiles(sharedSkillsRoot),
      resolveExistingAbsolutePath([path.join(homeDirectory, '.codex', 'config.toml')]),
      resolveExistingAbsolutePath([
        path.join(homeDirectory, '.config', 'opencode', 'opencode.jsonc'),
        path.join(homeDirectory, '.config', 'opencode', 'opencode.json'),
      ]),
      resolveExistingAbsolutePath([
        path.join(homeDirectory, '.config', 'opencode', 'oh-my-openagent.jsonc'),
        path.join(homeDirectory, '.config', 'opencode', 'oh-my-openagent.json'),
        path.join(homeDirectory, '.config', 'opencode', 'oh-my-opencode.jsonc'),
        path.join(homeDirectory, '.config', 'opencode', 'oh-my-opencode.json'),
      ]),
      pathExists(agentsTemplateDir),
      pathExists(codexTemplateDir),
      pathExists(opencodeTemplateDir),
    ])

  return {
    agentDoctorPath,
    agentsTemplatePath: hasAgentsTemplateDir ? agentsTemplateDir : null,
    bun,
    codex,
    codexTemplatePath: hasCodexTemplateDir ? codexTemplateDir : null,
    initAgentsTreePath,
    omx,
    opencode,
    opencodeTemplatePath: hasOpencodeTemplateDir ? opencodeTemplateDir : null,
    referencePolicy,
    sharedSkillsCount,
    sharedSkillsPath: sharedSkillsRoot,
    userCodexConfigPath,
    userOpenAgentConfigPath,
    userOpenCodeConfigPath,
  }
}

function buildAgentStackConfig(preset: RepoAgentPresetId) {
  const config: Record<string, unknown> = {
    artifacts: {
      jobsDir: '.workspace/agent-artifacts/jobs',
      notesDir: '.workspace/agent-artifacts/notes',
      root: '.workspace/agent-artifacts',
    },
    codex: {
      compatibilitySkillsPath: '.agents/skills',
      instructionsFile: 'AGENTS.md',
      officialConfigFile: '.codex/config.toml',
      officialSkillsPath: '.codex/skills',
    },
    referencePolicy,
    version: 1,
  }

  if (preset === 'omx-ready' || preset === 'all-in-one') {
    config.omx = {
      doctorCommand: 'omx doctor',
      recommendedScope: 'project',
      runtimeStateDir: '.omx',
      setupCommand: 'omx setup --scope project',
    }
  }

  if (preset === 'opencode' || preset === 'all-in-one') {
    config.opencode = {
      configDir: '.opencode',
      pluginConfig: 'opencode.jsonc',
      runtimeConfig: 'oh-my-openagent.jsonc',
    }
  }

  return config
}

async function scaffoldRepoAgentsFile(
  repoRoot: string,
  repoRelativePath: string,
  repoName: string,
  result: RepoAgentPresetResult,
) {
  const template = await readFile(repoAgentsTemplatePath, 'utf8')

  await createFileIfMissing(
    path.join(repoRoot, 'AGENTS.md'),
    renderTemplate(template, {
      __PARENT__: '(root)',
      __RELATIVE_PATH__: repoRelativePath,
      __TITLE__: repoName,
    }),
    result,
  )
}

async function scaffoldSharedSkills(repoRoot: string, result: RepoAgentPresetResult) {
  if (!(await pathExists(sharedSkillsRoot))) {
    result.notes.push('No tracked shared skills were available to sync into this repo.')
    return
  }

  const entries = await readdir(sharedSkillsRoot, { withFileTypes: true })
  const skillDirectories = entries.filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith('.'),
  )

  if (!skillDirectories.length) {
    result.notes.push('No tracked shared skills were available to sync into this repo.')
    return
  }

  for (const skillDirectory of skillDirectories) {
    for (const targetRoot of [
      path.join(repoRoot, '.agents', 'skills', skillDirectory.name),
      path.join(repoRoot, '.codex', 'skills', skillDirectory.name),
    ]) {
      await copyDirectoryMissingFiles(
        path.join(sharedSkillsRoot, skillDirectory.name),
        targetRoot,
        result,
      )
    }
  }
}

async function scaffoldCodexFiles(repoRoot: string, result: RepoAgentPresetResult) {
  const [readmeTemplate, configTemplate] = await Promise.all([
    readTextIfPresent(codexReadmeTemplatePath),
    readTextIfPresent(codexProjectConfigTemplatePath),
  ])

  if (!configTemplate) {
    throw new Error('Codex templates are missing from tools/templates/codex/.')
  }

  if (readmeTemplate) {
    await createFileIfMissing(
      path.join(repoRoot, '.codex', 'README.md'),
      readmeTemplate,
      result,
    )
  }

  await createFileIfMissing(
    path.join(repoRoot, '.codex', 'config.toml'),
    configTemplate,
    result,
  )
}

async function scaffoldAgentStack(
  repoRoot: string,
  preset: RepoAgentPresetId,
  result: RepoAgentPresetResult,
) {
  const targetPath = path.join(repoRoot, '.workspace', 'agent-stack.json')

  await createFileIfMissing(
    targetPath,
    `${JSON.stringify(buildAgentStackConfig(preset), null, 2)}\n`,
    result,
  )
}

async function scaffoldOpenCodeFiles(repoRoot: string, result: RepoAgentPresetResult) {
  const [readmeTemplate, opencodeTemplate, openAgentTemplate] = await Promise.all([
    readTextIfPresent(opencodeReadmeTemplatePath),
    readTextIfPresent(opencodeProjectTemplatePath),
    readTextIfPresent(openAgentProjectTemplatePath),
  ])

  if (!opencodeTemplate || !openAgentTemplate) {
    throw new Error('OpenCode templates are missing from tools/templates/opencode/.')
  }

  if (readmeTemplate) {
    await createFileIfMissing(
      path.join(repoRoot, '.opencode', 'README.md'),
      readmeTemplate,
      result,
    )
  }

  await createFileIfMissing(
    path.join(repoRoot, '.opencode', 'opencode.jsonc'),
    opencodeTemplate,
    result,
  )
  await createFileIfMissing(
    path.join(repoRoot, '.opencode', 'oh-my-openagent.jsonc'),
    openAgentTemplate,
    result,
  )
}

export function isRepoAgentPresetId(value: unknown): value is RepoAgentPresetId {
  return typeof value === 'string' && agentPresetIds.includes(value as RepoAgentPresetId)
}

export async function readWorkspaceAgentEnvironment(forceRefresh = false) {
  const now = Date.now()

  if (!forceRefresh && cachedEnvironment && cachedEnvironment.expiresAt > now) {
    return cachedEnvironment.value
  }

  const value = await buildWorkspaceAgentEnvironment()
  cachedEnvironment = {
    expiresAt: now + environmentCacheTtlMs,
    value,
  }

  return value
}

export async function applyRepoAgentPreset(
  repoRoot: string,
  repoRelativePath: string,
  repoName: string,
  preset: RepoAgentPresetId,
): Promise<RepoAgentPresetResult> {
  const result: RepoAgentPresetResult = {
    appliedFiles: [],
    notes: [],
    preset,
    skippedFiles: [],
  }

  await scaffoldRepoAgentsFile(repoRoot, repoRelativePath, repoName, result)
  await scaffoldSharedSkills(repoRoot, result)
  await scaffoldCodexFiles(repoRoot, result)

  if (preset !== 'codex-baseline') {
    await scaffoldAgentStack(repoRoot, preset, result)
  }

  if (preset === 'opencode' || preset === 'all-in-one') {
    await scaffoldOpenCodeFiles(repoRoot, result)
  }

  const environment = await readWorkspaceAgentEnvironment()

  if ((preset === 'omx-ready' || preset === 'all-in-one') && !environment.omx.available) {
    result.notes.push(
      'The `omx` command is not installed in this workspace yet. This preset only scaffolds tracked repo files and hints.',
    )
  }

  if ((preset === 'opencode' || preset === 'all-in-one') && !environment.opencode.available) {
    result.notes.push(
      'The `opencode` command is not installed in this workspace yet. The tracked repo config was still scaffolded.',
    )
  }

  if (!result.appliedFiles.length) {
    result.notes.push('All tracked preset files were already present. Existing repo files were preserved.')
  } else {
    result.notes.push(
      'Existing repo files were preserved. Use tools/scripts/init-agents-tree.sh later if this repo needs deeper folder-level AGENTS.md guidance.',
    )
  }

  return result
}
