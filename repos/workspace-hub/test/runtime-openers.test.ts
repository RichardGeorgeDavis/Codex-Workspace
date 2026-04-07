import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  resolveOpenInTerminalCommand,
  resolveOpenTargetCommand,
} from '../server/runtime-manager.ts'

test('resolveOpenTargetCommand returns expected command for darwin', () => {
  const resolved = resolveOpenTargetCommand('/tmp/example', 'darwin')
  assert.equal(resolved.command, 'open')
  assert.deepEqual(resolved.args, ['/tmp/example'])
})

test('resolveOpenTargetCommand returns expected command for win32', () => {
  const resolved = resolveOpenTargetCommand('C:\\workspace', 'win32')
  assert.equal(resolved.command, 'cmd')
  assert.deepEqual(resolved.args, ['/c', 'start', '""', 'C:\\workspace'])
})

test('resolveOpenTargetCommand throws on unsupported platform', () => {
  assert.throws(
    () => {
      resolveOpenTargetCommand('/tmp/example', 'freebsd')
    },
    /Opening files is not supported on platform "freebsd"\./,
  )
})

test('resolveOpenInTerminalCommand returns expected command for darwin', () => {
  const resolved = resolveOpenInTerminalCommand('/tmp/example', 'darwin')
  assert.equal(resolved.command, 'open')
  assert.deepEqual(resolved.args, ['-a', 'Terminal', '/tmp/example'])
})

test('resolveOpenInTerminalCommand returns expected command for win32', () => {
  const resolved = resolveOpenInTerminalCommand('C:\\workspace', 'win32')
  assert.equal(resolved.command, 'cmd')
  assert.deepEqual(resolved.args, ['/c', 'start', 'wt', '-d', 'C:\\workspace'])
})

test('resolveOpenInTerminalCommand throws on unsupported platform', () => {
  assert.throws(
    () => {
      resolveOpenInTerminalCommand('/tmp/example', 'freebsd')
    },
    /Opening terminal is not supported on platform "freebsd"\./,
  )
})
