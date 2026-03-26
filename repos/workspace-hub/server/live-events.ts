import type { Request, Response } from 'express'

import type { WorkspaceEvent } from '../src/types/workspace.ts'

const clients = new Set<Response>()
const heartbeatIntervalMs = 15000

function buildEvent(
  event: Omit<WorkspaceEvent, 'generatedAt'>,
): WorkspaceEvent {
  return {
    ...event,
    generatedAt: new Date().toISOString(),
  }
}

function writeEvent(
  response: Response,
  event: Omit<WorkspaceEvent, 'generatedAt'>,
) {
  response.write(`data: ${JSON.stringify(buildEvent(event))}\n\n`)
}

export function publishWorkspaceEvent(
  event: Omit<WorkspaceEvent, 'generatedAt'>,
) {
  for (const response of clients) {
    writeEvent(response, event)
  }
}

export function handleWorkspaceEvents(
  request: Request,
  response: Response,
) {
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('Content-Type', 'text/event-stream')
  response.flushHeaders?.()

  clients.add(response)
  writeEvent(response, {
    message: 'Workspace Hub event stream connected.',
    relativePath: null,
    type: 'connected',
  })

  const heartbeat = setInterval(() => {
    response.write(': heartbeat\n\n')
  }, heartbeatIntervalMs)

  const cleanup = () => {
    clearInterval(heartbeat)
    clients.delete(response)
    response.end()
  }

  request.on('close', cleanup)
}
