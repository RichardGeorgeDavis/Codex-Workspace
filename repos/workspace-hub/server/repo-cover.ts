import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import type { WorkspaceRepo } from '../src/types/workspace.ts'
import { canRunRepo, startRepoRuntime, stopRepoRuntime } from './runtime-manager.ts'

const execFileAsync = promisify(execFile)
const coverBlockStart = '<!-- workspace-hub:cover:start -->'
const coverBlockEnd = '<!-- workspace-hub:cover:end -->'
const browserOverride = process.env.WORKSPACE_HUB_SCREENSHOT_BROWSER?.trim() ?? ''
const coverPathOverride = process.env.WORKSPACE_HUB_COVER_RELATIVE_PATH?.trim() ?? ''
const screenshotSettleMsOverride = process.env.WORKSPACE_HUB_SCREENSHOT_SETTLE_MS?.trim() ?? ''
const screenshotVirtualTimeMsOverride =
  process.env.WORKSPACE_HUB_SCREENSHOT_VIRTUAL_TIME_MS?.trim() ?? ''
const absoluteBrowserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Arc.app/Contents/MacOS/Arc',
]
const pathBrowserCandidates = [
  'google-chrome',
  'chromium',
  'chromium-browser',
  'brave-browser',
  'microsoft-edge',
]
const preferredCoverRelativePaths = [
  path.join('docs', 'cover.png'),
  path.join('.github', 'assets', 'cover.png'),
  path.join('.github', 'cover.png'),
  path.join('assets', 'cover.png'),
  path.join('images', 'cover.png'),
  path.join('screenshots', 'cover.png'),
]
const defaultScreenshotSettleMs = 3000
const defaultScreenshotVirtualTimeMs = 8000

export type RepoCoverResult = {
  coverImagePath: string
  previewUrl: string
  readmeCreated: boolean
  readmePath: string
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function parsePositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function resolveBrowserExecutable() {
  if (browserOverride) {
    if (browserOverride.includes(path.sep)) {
      if (await fileExists(browserOverride)) {
        return browserOverride
      }
    } else {
      try {
        const resolved = await execFileAsync('/usr/bin/which', [browserOverride])
        const candidate = resolved.stdout.trim()
        if (candidate) {
          return candidate
        }
      } catch {
        // Fall through to known candidates.
      }
    }
  }

  for (const candidate of absoluteBrowserCandidates) {
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  for (const candidate of pathBrowserCandidates) {
    try {
      const resolved = await execFileAsync('/usr/bin/which', [candidate])
      const nextPath = resolved.stdout.trim()
      if (nextPath) {
        return nextPath
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    'No supported browser executable was found. Set WORKSPACE_HUB_SCREENSHOT_BROWSER to a Chrome-compatible browser path.',
  )
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

async function captureScreenshot(url: string, outputPath: string) {
  const browserPath = await resolveBrowserExecutable()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'workspace-hub-cover-'))
  const screenshotVirtualTimeMs = parsePositiveInteger(
    screenshotVirtualTimeMsOverride,
    defaultScreenshotVirtualTimeMs,
  )

  try {
    await mkdir(path.dirname(outputPath), { recursive: true })

    await execFileAsync(
      browserPath,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--run-all-compositor-stages-before-draw',
        `--virtual-time-budget=${screenshotVirtualTimeMs}`,
        '--window-size=1600,900',
        `--user-data-dir=${userDataDir}`,
        `--screenshot=${outputPath}`,
        url,
      ],
      { timeout: 30000 },
    )
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to capture a screenshot with the configured browser.'

    throw new Error(message)
  } finally {
    await rm(userDataDir, { force: true, recursive: true })
  }

  if (!(await fileExists(outputPath))) {
    throw new Error('The screenshot command completed, but no cover image was written.')
  }
}

async function waitForReachablePreview(url: string, timeoutMs = 10000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 900)

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.ok) {
        return true
      }
    } catch {
      // Keep polling until timeout.
    } finally {
      clearTimeout(timeout)
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })
  }

  return false
}

function canBootstrapPreview(repo: WorkspaceRepo) {
  return repo.type === 'static' && repo.previewUrlSource === 'inferred' && canRunRepo(repo)
}

function resolveReadmePath(repo: WorkspaceRepo) {
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

async function resolveCoverImagePath(
  repoPath: string,
  readmePath: string,
  existingReadme: string,
) {
  if (coverPathOverride) {
    return resolveRepoScopedPath(
      repoPath,
      coverPathOverride,
      'WORKSPACE_HUB_COVER_RELATIVE_PATH must stay inside the repo.',
    )
  }

  const existingCoverPath = extractExistingCoverImagePath(
    existingReadme,
    readmePath,
    repoPath,
  )

  if (existingCoverPath) {
    return existingCoverPath
  }

  for (const relativePath of preferredCoverRelativePaths) {
    const candidatePath = path.join(repoPath, relativePath)

    if (await fileExists(candidatePath)) {
      return candidatePath
    }
  }

  for (const relativePath of preferredCoverRelativePaths) {
    const candidatePath = path.join(repoPath, relativePath)

    if (await fileExists(path.dirname(candidatePath))) {
      return candidatePath
    }
  }

  return path.join(repoPath, preferredCoverRelativePaths[0])
}

export async function generateRepoCover(repo: WorkspaceRepo): Promise<RepoCoverResult> {
  if (!repo.previewUrl) {
    throw new Error('This repo does not have a preview URL yet.')
  }

  const readmeTarget = resolveReadmePath(repo)
  const existingReadme = await readFile(readmeTarget.path, 'utf8').catch(() => '')
  const coverImagePath = await resolveCoverImagePath(
    repo.path,
    readmeTarget.path,
    existingReadme,
  )
  let startedRuntimeForCapture = false
  const screenshotSettleMs = parsePositiveInteger(
    screenshotSettleMsOverride,
    defaultScreenshotSettleMs,
  )

  try {
    let previewReachable = await waitForReachablePreview(
      repo.previewUrl,
      repo.health.state === 'healthy' ? 1500 : 3500,
    )

    if (
      !previewReachable &&
      repo.runtime.status !== 'running' &&
      canBootstrapPreview(repo)
    ) {
      await startRepoRuntime(repo)
      startedRuntimeForCapture = true
      previewReachable = await waitForReachablePreview(repo.previewUrl, 12000)
    }

    if (!previewReachable) {
      throw new Error(
        'The current preview URL is unreachable. Start the repo or fix the preview URL before generating a cover image.',
      )
    }

    if (screenshotSettleMs > 0) {
      await sleep(screenshotSettleMs)
    }

    await captureScreenshot(repo.previewUrl, coverImagePath)
    const coverBlock = buildCoverBlock(repo.name, readmeTarget.path, coverImagePath)
    const nextReadme = injectCoverBlock(existingReadme, repo.name, coverBlock)

    await writeFile(readmeTarget.path, nextReadme, 'utf8')

    return {
      coverImagePath,
      previewUrl: repo.previewUrl,
      readmeCreated: readmeTarget.created && existingReadme.length === 0,
      readmePath: readmeTarget.path,
    }
  } finally {
    if (startedRuntimeForCapture) {
      await stopRepoRuntime(repo.path).catch(() => null)
    }
  }
}
