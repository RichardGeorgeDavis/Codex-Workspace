import type { RepoAgentTooling } from '../../types/workspace.ts'

export function collectAgentToolingLabels(agentTooling: RepoAgentTooling) {
  const labels: string[] = []

  if (agentTooling.agentStackPath) {
    labels.push('agent stack')
  }

  if (agentTooling.codexProjectConfigPath || agentTooling.codexProjectSkillsPath) {
    labels.push('.codex')
  }

  if (agentTooling.omxPath) {
    labels.push('omx')
  }

  if (agentTooling.openAgentConfigPath || agentTooling.openAgentLegacyConfigPath) {
    labels.push('openagent')
  }

  if (agentTooling.openCodePath) {
    labels.push('opencode')
  }

  if (agentTooling.codexSkillsPath) {
    labels.push('.agents skills')
  }

  if (agentTooling.workspaceSkillsPath) {
    labels.push('workspace skills')
  }

  if (agentTooling.agentsPath) {
    labels.push('AGENTS.md')
  }

  return labels
}

export function formatAgentToolingSummary(agentTooling: RepoAgentTooling) {
  const labels = collectAgentToolingLabels(agentTooling)

  if (!labels.length) {
    return 'No repo-local agent tooling detected'
  }

  const [first, second] = labels
  const remainder = labels.length - 2

  if (!second) {
    return first
  }

  return remainder > 0 ? `${first}, ${second}, +${remainder}` : `${first}, ${second}`
}

export function formatOpenAgentConfigLabel(agentTooling: RepoAgentTooling) {
  if (agentTooling.openAgentConfigPath && agentTooling.openAgentLegacyConfigPath) {
    return `${agentTooling.openAgentConfigPath} plus legacy ${agentTooling.openAgentLegacyConfigPath}`
  }

  if (agentTooling.openAgentConfigPath) {
    return agentTooling.openAgentConfigPath
  }

  if (agentTooling.openAgentLegacyConfigPath) {
    return `${agentTooling.openAgentLegacyConfigPath} (legacy basename)`
  }

  return 'Not detected'
}
