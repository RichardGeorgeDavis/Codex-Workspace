import { execFile } from 'node:child_process'
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type { WorkspaceRepo } from '../src/types/workspace.ts'
import { writeRepoManifest } from './repo-manifest.ts'

const execFileAsync = promisify(execFile)
const coverBlockStart = '<!-- workspace-hub:cover:start -->'
const coverBlockEnd = '<!-- workspace-hub:cover:end -->'
const readmeTemplateRelativePath = path.join(
  'tools',
  'templates',
  'repo-docs',
  'README.template.md',
)
const coverPlaceholderRelativePath = path.join(
  'tools',
  'templates',
  'repo-docs',
  'cover-placeholder.png',
)
const defaultCoverRelativePath = path.join('docs', 'cover.png')

export type RepoIntakeResult = {
  coverCreated: boolean
  coverImagePath: string
  manifestCreated: boolean
  manifestPath: string | null
  notes: string[]
  readmeCreated: boolean
  readmePath: string
  readmeUpdated: boolean
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function saveRepoCloseout(workspaceRoot: string, repoPath: string) {
  const workspaceMemoryPath = path.join(workspaceRoot, 'tools', 'bin', 'workspace-memory')

  if (!(await fileExists(workspaceMemoryPath))) {
    return 'Workspace memory wrapper not found, so the Codex-thread closeout was skipped.'
  }

  try {
    await execFileAsync(workspaceMemoryPath, ['save-repo', repoPath], {
      cwd: workspaceRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 16,
    })
    return 'Repo closeout was saved to workspace memory for the current Codex thread.'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return `Workspace memory closeout failed: ${message}`
  }
}

function sanitizeAltText(value: string) {
  return value.replace(/[[\]]/g, '').trim() || 'Repo cover'
}

function isPathInsideRepo(repoPath: string, candidatePath: string) {
  const relativePath = path.relative(repoPath, candidatePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

function resolveRepoScopedPath(repoPath: string, relativePath: string, errorMessage: string) {
  const absolutePath = path.resolve(repoPath, relativePath)

  if (!isPathInsideRepo(repoPath, absolutePath)) {
    throw new Error(errorMessage)
  }

  return absolutePath
}

function toMarkdownRelativePath(fromPath: string, toPath: string) {
  return path.relative(path.dirname(fromPath), toPath).split(path.sep).join('/')
}

function buildCoverBlock(repoName: string, readmePath: string, coverImagePath: string) {
  const markdownPath = toMarkdownRelativePath(readmePath, coverImagePath)
  const altText = sanitizeAltText(`${repoName} cover`)

  return `${coverBlockStart}\n![${altText}](${markdownPath})\n${coverBlockEnd}`
}

function replaceExistingCoverBlock(content: string, block: string) {
  const startIndex = content.indexOf(coverBlockStart)
  const endIndex = content.indexOf(coverBlockEnd)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null
  }

  const afterBlockIndex = endIndex + coverBlockEnd.length

  return `${content.slice(0, startIndex)}${block}${content.slice(afterBlockIndex)}`
}

function extractExistingCoverImagePath(
  content: string,
  readmePath: string,
  repoPath: string,
) {
  const startIndex = content.indexOf(coverBlockStart)
  const endIndex = content.indexOf(coverBlockEnd)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null
  }

  const block = content.slice(startIndex, endIndex + coverBlockEnd.length)
  const match = block.match(/!\[[^\]]*]\(([^)]+)\)/)

  if (!match?.[1]) {
    return null
  }

  const markdownPath = match[1].trim().replace(/^<|>$/g, '')

  if (
    !markdownPath ||
    markdownPath.startsWith('#') ||
    markdownPath.startsWith('data:') ||
    markdownPath.startsWith('http://') ||
    markdownPath.startsWith('https://')
  ) {
    return null
  }

  const absolutePath = path.resolve(path.dirname(readmePath), markdownPath)

  if (!isPathInsideRepo(repoPath, absolutePath)) {
    return null
  }

  return absolutePath
}

function injectCoverBlock(content: string, repoName: string, block: string) {
  if (!content.trim()) {
    return `# ${repoName}\n\n${block}\n`
  }

  const replaced = replaceExistingCoverBlock(content, block)
  if (replaced !== null) {
    return replaced.trimEnd() + '\n'
  }

  const headingMatch = content.match(/^# .+$/m)
  if (headingMatch?.index !== undefined) {
    const headingEnd = headingMatch.index + headingMatch[0].length
    const before = content.slice(0, headingEnd)
    const after = content.slice(headingEnd).replace(/^\r?\n*/, '')

    return `${before}\n\n${block}\n\n${after}`.trimEnd() + '\n'
  }

  return `${block}\n\n${content}`.trimEnd() + '\n'
}

function replaceTemplateToken(template: string, token: string, value: string) {
  return template.split(`{{${token}}}`).join(value)
}

function formatReadmeTemplate(template: string, repo: WorkspaceRepo) {
  let nextTemplate = template

  nextTemplate = replaceTemplateToken(nextTemplate, 'PROJECT_NAME', repo.name)
  nextTemplate = replaceTemplateToken(nextTemplate, 'REPO_TYPE', repo.type)
  nextTemplate = replaceTemplateToken(nextTemplate, 'RUNTIME_MODE', repo.preferredMode)
  nextTemplate = replaceTemplateToken(
    nextTemplate,
    'PREVIEW_URL',
    repo.previewUrl ?? 'Not inferred yet',
  )
  nextTemplate = replaceTemplateToken(
    nextTemplate,
    'INSTALL_COMMAND',
    repo.installCommand ?? 'Review the repo files and add the repo-native install command.',
  )
  nextTemplate = replaceTemplateToken(
    nextTemplate,
    'DEV_COMMAND',
    repo.devCommand ??
      '# Review package scripts or local instructions and add the repo-native run command here.',
  )

  return nextTemplate.trimEnd() + '\n'
}

function resolveReadmeTarget(repo: WorkspaceRepo) {
  if (repo.readmePath && repo.readmePath.toLowerCase().endsWith('.md')) {
    return {
      created: false,
      path: repo.readmePath,
    }
  }

  return {
    created: true,
    path: path.join(repo.path, 'README.md'),
  }
}

function shouldCreateManifest(repo: WorkspaceRepo) {
  if (repo.hasManifest) {
    return false
  }

  if (repo.type === 'php' || repo.type === 'other' || repo.type === 'wordpress') {
    return true
  }

  if (repo.preferredMode === 'external' || repo.previewUrlSource === 'unknown') {
    return true
  }

  if (!repo.devCommand && repo.type !== 'static') {
    return true
  }

  return false
}

function buildManifestForIntake(repo: WorkspaceRepo) {
  return {
    ...repo.suggestedManifest,
    buildCommand: repo.buildCommand ?? repo.suggestedManifest.buildCommand,
    devCommand: repo.devCommand ?? repo.suggestedManifest.devCommand,
    externalUrl: repo.externalUrl ?? repo.suggestedManifest.externalUrl,
    healthcheckUrl: repo.healthcheckUrl ?? repo.suggestedManifest.healthcheckUrl,
    installCommand: repo.installCommand ?? repo.suggestedManifest.installCommand,
    preferredMode: repo.preferredMode,
    previewUrl:
      repo.previewUrl && repo.previewUrlSource !== 'runtime'
        ? repo.previewUrl
        : repo.suggestedManifest.previewUrl,
    servbayPath: repo.servbayPath ?? repo.suggestedManifest.servbayPath,
    servbaySubdomain: repo.servbaySubdomain ?? repo.suggestedManifest.servbaySubdomain,
  }
}

async function resolveCoverImagePath(
  repo: WorkspaceRepo,
  readmePath: string,
  readmeContent: string,
) {
  const existingCoverPath = extractExistingCoverImagePath(
    readmeContent,
    readmePath,
    repo.path,
  )

  if (existingCoverPath) {
    return existingCoverPath
  }

  return resolveRepoScopedPath(
    repo.path,
    defaultCoverRelativePath,
    'The default repo cover path must stay inside the repo.',
  )
}

export async function runRepoIntake(
  repo: WorkspaceRepo,
  workspaceRoot: string,
): Promise<RepoIntakeResult> {
  const readmeTemplatePath = path.join(workspaceRoot, readmeTemplateRelativePath)
  const coverPlaceholderPath = path.join(workspaceRoot, coverPlaceholderRelativePath)

  if (!(await fileExists(readmeTemplatePath))) {
    throw new Error(`Repo README template not found at ${readmeTemplatePath}.`)
  }

  if (!(await fileExists(coverPlaceholderPath))) {
    throw new Error(`Repo cover placeholder not found at ${coverPlaceholderPath}.`)
  }

  const notes: string[] = []
  const readmeTarget = resolveReadmeTarget(repo)
  const originalReadme = await readFile(readmeTarget.path, 'utf8').catch(() => '')
  const readmeExisted = originalReadme.length > 0
  let nextReadme = originalReadme

  if (!readmeExisted) {
    const template = await readFile(readmeTemplatePath, 'utf8')
    nextReadme = formatReadmeTemplate(template, repo)
    notes.push('README.md scaffolded from the workspace repo-docs template.')
  } else if (!repo.readmePath) {
    notes.push('A new Markdown README was created because the repo did not expose one.')
  } else if (!repo.readmePath.toLowerCase().endsWith('.md')) {
    notes.push(`Existing ${path.basename(repo.readmePath)} was left in place and a README.md was added.`)
  }

  const coverImagePath = await resolveCoverImagePath(repo, readmeTarget.path, nextReadme)
  const coverBlock = buildCoverBlock(repo.name, readmeTarget.path, coverImagePath)
  const readmeWithCover = injectCoverBlock(nextReadme, repo.name, coverBlock)
  const readmeUpdated = readmeWithCover !== originalReadme

  if (readmeUpdated) {
    await mkdir(path.dirname(readmeTarget.path), { recursive: true })
    await writeFile(readmeTarget.path, readmeWithCover, 'utf8')
  }

  let coverCreated = false

  if (!(await fileExists(coverImagePath))) {
    await mkdir(path.dirname(coverImagePath), { recursive: true })
    await copyFile(coverPlaceholderPath, coverImagePath)
    coverCreated = true
    notes.push('Placeholder repo cover image created.')
  }

  if (!readmeUpdated) {
    notes.push('README already had the expected cover block and did not need changes.')
  }

  let manifestCreated = false
  let manifestPath: string | null = null

  if (repo.hasManifest) {
    manifestPath = repo.manifestPath
    notes.push('Existing manifest kept in place.')
  } else if (shouldCreateManifest(repo)) {
    const result = await writeRepoManifest(repo.path, buildManifestForIntake(repo))
    manifestCreated = true
    manifestPath = result.manifestPath
    notes.push('Manifest created because this repo benefits from explicit runtime metadata.')
  } else {
    notes.push('Manifest skipped because runtime behavior looks clear from the repo files.')
  }

  notes.push(await saveRepoCloseout(workspaceRoot, repo.relativePath))

  return {
    coverCreated,
    coverImagePath,
    manifestCreated,
    manifestPath,
    notes,
    readmeCreated: !readmeExisted,
    readmePath: readmeTarget.path,
    readmeUpdated,
  }
}
