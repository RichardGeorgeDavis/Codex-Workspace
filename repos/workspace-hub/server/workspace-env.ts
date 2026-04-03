import path from 'node:path'

export function getSharedPlaywrightBrowsersPath(workspaceRoot: string) {
  return path.join(workspaceRoot, 'cache', 'playwright-browsers')
}

export function applyWorkspaceProcessEnv(
  workspaceRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (!environment.PLAYWRIGHT_BROWSERS_PATH?.trim()) {
    environment.PLAYWRIGHT_BROWSERS_PATH =
      getSharedPlaywrightBrowsersPath(workspaceRoot)
  }

  if (!environment.PLAYWRIGHT_SKIP_BROWSER_GC?.trim()) {
    environment.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
  }

  return environment
}
