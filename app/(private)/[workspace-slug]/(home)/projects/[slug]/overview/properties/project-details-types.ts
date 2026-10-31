import type { useUpdateProject } from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'

// What the PATCH accepts, taken from the mutation itself so it cannot drift
// from the hook (useUpdateProject does not export its payload type).
export type ProjectUpdate = Parameters<
  ReturnType<typeof useUpdateProject>['mutate']
>[0]

// What ProjectDetails hands to the properties panel.
export interface ProjectDetailsPropertiesProps {
  workspaceId: string
  projectSlug: string
  /** Workspace OWNER/ADMIN or the project's lead (the ProjectService.update rule). */
  canManage: boolean
}

// What every field receives from the panel. `project` is already loaded: the
// panel returns before rendering a field while it is not.
export interface ProjectDetailsFieldProps {
  workspaceId: string
  project: ProjectDTO
  canManage: boolean
  /** A PATCH is in flight: the triggers disable themselves. */
  pending: boolean
  /** PATCHes the project and toasts `success`. */
  save: (data: ProjectUpdate, success: string) => void
}
