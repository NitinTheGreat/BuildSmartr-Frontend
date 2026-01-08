/**
 * SHARE PROJECT FEATURE - TEMPORARILY DISABLED
 * 
 * This component has been disabled. To re-enable:
 * 1. Restore the original ShareProjectModal implementation from git history
 * 2. Uncomment the share buttons in ProjectChatInterface.tsx
 * 3. Uncomment the API routes in app/api/projects/[project_id]/shares/
 * 4. Uncomment the types in types/api.ts and types/project.ts
 */

// Placeholder export to prevent import errors while feature is disabled
export function ShareProjectModal(_props: {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
}) {
  // Feature disabled - returns null (renders nothing)
  return null
}
