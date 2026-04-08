import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  defaultRepoLayoutMode,
  loadStoredRepoLayoutMode,
  persistRepoLayoutMode,
  repoLayoutStorageKey,
  resolveRepoLayoutMode,
  resolveSelectedRepoPath,
} from '../src/features/layout/repoLayout.ts'

const originalWindow = globalThis.window

afterEach(() => {
  globalThis.window = originalWindow
})

function installLocalStorageStub() {
  const store = new Map<string, string>()

  globalThis.window = {
    localStorage: {
      getItem(key: string) {
        return store.get(key) ?? null
      },
      removeItem(key: string) {
        store.delete(key)
      },
      setItem(key: string, value: string) {
        store.set(key, value)
      },
    },
  } as Window & typeof globalThis

  return store
}

test('repo layout preference persists through local storage', () => {
  const store = installLocalStorageStub()

  persistRepoLayoutMode('discovery-first')

  assert.equal(store.get(repoLayoutStorageKey), JSON.stringify('discovery-first'))
  assert.equal(loadStoredRepoLayoutMode(), 'discovery-first')
})

test('repo layout preference falls back to split when storage is missing or invalid', () => {
  assert.equal(loadStoredRepoLayoutMode(), defaultRepoLayoutMode)

  installLocalStorageStub().set(repoLayoutStorageKey, JSON.stringify('unexpected'))
  assert.equal(loadStoredRepoLayoutMode(), defaultRepoLayoutMode)
  assert.equal(resolveRepoLayoutMode('bad-mode'), defaultRepoLayoutMode)
})

test('split mode auto-selects a default repo and discovery-first mode waits for selection', () => {
  const repoPaths = ['/repos/a', '/repos/b']

  assert.equal(resolveSelectedRepoPath('split', repoPaths, null, repoPaths[1]), repoPaths[1])
  assert.equal(resolveSelectedRepoPath('split', repoPaths, null, null), repoPaths[0])
  assert.equal(resolveSelectedRepoPath('discovery-first', repoPaths, null, repoPaths[0]), null)
  assert.equal(
    resolveSelectedRepoPath('discovery-first', repoPaths, repoPaths[1], repoPaths[0]),
    repoPaths[1],
  )
  assert.equal(resolveSelectedRepoPath('split', [], null, null), null)
})
