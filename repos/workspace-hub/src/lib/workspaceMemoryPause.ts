export const workspaceMemoryServiceId = 'mempalace'
export const workspaceMemoryMaintenancePausedReason =
  'Workspace memory is temporarily paused.'

export function isWorkspaceMemoryService(serviceId: string) {
  return serviceId === workspaceMemoryServiceId
}
