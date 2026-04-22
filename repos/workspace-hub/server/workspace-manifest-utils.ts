import path from 'node:path'

export type ResolvedWorkspaceCommand = {
  args: string[]
  display: string
  path: string
}

function quoteCommandArg(value: string) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value
  }

  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function formatWorkspaceCommandDisplay(args: string[]) {
  return args.map((arg) => quoteCommandArg(arg)).join(' ')
}

export function isPathInsideRoot(rootPath: string, candidatePath: string) {
  const relativePath = path.relative(rootPath, candidatePath)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  )
}

export function resolveWorkspacePath(
  workspaceRoot: string,
  relativePath: string | null | undefined,
) {
  if (!relativePath?.trim()) {
    return null
  }

  const candidatePath = path.resolve(workspaceRoot, relativePath.trim())

  if (!isPathInsideRoot(workspaceRoot, candidatePath)) {
    return null
  }

  return candidatePath
}

export function resolveWorkspaceCommand(
  workspaceRoot: string,
  commandValue: unknown,
): ResolvedWorkspaceCommand | null {
  if (!Array.isArray(commandValue) || commandValue.length === 0) {
    return null
  }

  const trimmedArgs = commandValue.map((entry) =>
    typeof entry === 'string' ? entry.trim() : '',
  )

  if (trimmedArgs.some((entry) => !entry)) {
    return null
  }

  const commandPath = resolveWorkspacePath(workspaceRoot, trimmedArgs[0])
  if (!commandPath) {
    return null
  }

  return {
    args: [commandPath, ...trimmedArgs.slice(1)],
    display: formatWorkspaceCommandDisplay(trimmedArgs),
    path: commandPath,
  }
}

export function resolveWorkspaceCommandList(
  workspaceRoot: string,
  commandListValue: unknown,
) {
  if (commandListValue == null) {
    return []
  }

  if (!Array.isArray(commandListValue)) {
    return null
  }

  const commands: ResolvedWorkspaceCommand[] = []

  for (const commandValue of commandListValue) {
    const resolvedCommand = resolveWorkspaceCommand(workspaceRoot, commandValue)
    if (!resolvedCommand) {
      return null
    }

    commands.push(resolvedCommand)
  }

  return commands
}
