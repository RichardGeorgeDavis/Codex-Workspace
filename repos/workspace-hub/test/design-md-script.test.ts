import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..')
const scriptPath = path.join(workspaceRoot, 'tools', 'scripts', 'design-md.sh')

let tempRoot = ''

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function writeExecutable(targetPath: string, content: string) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
  await chmod(targetPath, 0o755)
}

before(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'codex-design-md-script-'))
})

after(async () => {
  if (tempRoot) {
    await rm(tempRoot, { force: true, recursive: true })
  }
})

test('design-md init creates a starter file and refuses overwrite by default', async () => {
  const repoRoot = path.join(tempRoot, 'repo-init')
  await mkdir(repoRoot, { recursive: true })

  const initResult = await execFileAsync(scriptPath, ['init', repoRoot], {
    cwd: workspaceRoot,
  })
  assert.match(initResult.stdout, /Initialized:/)

  const designPath = path.join(repoRoot, 'DESIGN.md')
  assert.equal(await pathExists(designPath), true)

  const created = await readFile(designPath, 'utf8')
  assert.match(created, /version: alpha/)
  assert.match(created, /## Overview/)

  await assert.rejects(
    execFileAsync(scriptPath, ['init', repoRoot], {
      cwd: workspaceRoot,
    }),
    /Refusing to overwrite existing file/,
  )
})

test('design-md lint and diff delegate to the configured npx binary', async () => {
  const repoRoot = path.join(tempRoot, 'repo-npx')
  const logsDir = path.join(tempRoot, 'logs')
  const logPath = path.join(logsDir, 'npx.log')
  const fakeNpxPath = path.join(tempRoot, 'bin', 'fake-npx.sh')
  await mkdir(repoRoot, { recursive: true })
  await mkdir(logsDir, { recursive: true })
  await writeFile(path.join(repoRoot, 'DESIGN.md'), '# fixture\n', 'utf8')
  await writeFile(path.join(repoRoot, 'DESIGN-next.md'), '# fixture next\n', 'utf8')

  await writeExecutable(
    fakeNpxPath,
    `#!/usr/bin/env sh
set -eu
printf '%s\\n' "$*" >> "${logPath}"
if [ "$3" = "lint" ]; then
  printf '{"findings":[],"summary":{"errors":0,"warnings":0,"info":0}}\\n'
  exit 0
fi
if [ "$3" = "diff" ]; then
  printf '{"tokens":{},"regression":false}\\n'
  exit 0
fi
exit 1
`,
  )

  const lintResult = await execFileAsync(scriptPath, ['lint', repoRoot], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DESIGN_MD_NPX_BIN: fakeNpxPath,
    },
  })
  assert.match(lintResult.stdout, /"errors":0/)

  const diffResult = await execFileAsync(
    scriptPath,
    ['diff', repoRoot, path.join(repoRoot, 'DESIGN-next.md')],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        DESIGN_MD_NPX_BIN: fakeNpxPath,
      },
    },
  )
  assert.match(diffResult.stdout, /"regression":false/)

  const log = await readFile(logPath, 'utf8')
  assert.match(log, /-y @google\/design\.md lint .*repo-npx\/DESIGN\.md/)
  assert.match(log, /-y @google\/design\.md diff .*repo-npx\/DESIGN\.md .*repo-npx\/DESIGN-next\.md/)
})

test('design-md examples delegates list and copy flows to the configured examples script', async () => {
  const fakeExamplesPath = path.join(tempRoot, 'bin', 'fake-examples.sh')
  const logPath = path.join(tempRoot, 'logs', 'examples.log')
  const repoRoot = path.join(tempRoot, 'repo-examples')
  await mkdir(path.join(tempRoot, 'logs'), { recursive: true })
  await mkdir(repoRoot, { recursive: true })

  await writeExecutable(
    fakeExamplesPath,
    `#!/usr/bin/env sh
set -eu
printf '%s\\n' "$*" >> "${logPath}"
if [ "\${1:-}" = "--list" ]; then
  printf 'vercel\\n'
  exit 0
fi
printf 'copied\\n'
`,
  )

  const listResult = await execFileAsync(scriptPath, ['examples', 'list'], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DESIGN_MD_EXAMPLES_SCRIPT: fakeExamplesPath,
    },
  })
  assert.match(listResult.stdout, /vercel/)

  const copyResult = await execFileAsync(
    scriptPath,
    ['examples', 'copy', '--force', 'vercel', repoRoot],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        DESIGN_MD_EXAMPLES_SCRIPT: fakeExamplesPath,
      },
    },
  )
  assert.match(copyResult.stdout, /copied/)

  const log = await readFile(logPath, 'utf8')
  assert.match(log, /^--list$/m)
  assert.match(log, /--force vercel .*repo-examples/)
})
