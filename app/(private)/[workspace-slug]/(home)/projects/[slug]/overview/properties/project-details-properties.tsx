'use client'

import { H4 } from '@/components/typography/heading/h4'
import { notify } from '@/lib/notify'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'
import { ProjectDetailsDatesField } from './project-details-dates-field'
import { ProjectDetailsLabelsField } from './project-details-labels-field'
import { ProjectDetailsLeadField } from './project-details-lead-field'
import { ProjectDetailsMembersField } from './project-details-members-field'
import { ProjectDetailsPriorityField } from './project-details-priority-field'
import { ProjectDetailsStateField } from './project-details-state-field'
import type {
  ProjectDetailsPropertiesProps,
  ProjectUpdate,
} from './project-details-types'

// Loads the project and owns the one PATCH every field goes through. Each
// field reads what only it needs (states, members, labels) in its own
// component, so no hook sits below the early return.
export function ProjectDetailsProperties({
  workspaceId,
  projectSlug,
  canManage,
}: ProjectDetailsPropertiesProps) {
  const { data: project } = useProject(workspaceId, projectSlug)
  const update = useUpdateProject(workspaceId, projectSlug)

  function save(data: ProjectUpdate, success: string) {
    notify.run(update.mutateAsync(data), {
      loading: 'Salvando...',
      success,
      error: 'Não foi possível salvar',
    })
  }

  if (!project) return null

  const field = {
    workspaceId,
    project,
    canManage,
    pending: update.isPending,
    save,
  }

  return (
    <>
      <H4 className='text-lg'>Propriedades</H4>
      <div className='space-y-2'>
        <ProjectDetailsStateField {...field} />
        <ProjectDetailsPriorityField {...field} />
        <ProjectDetailsLeadField {...field} />
        <ProjectDetailsMembersField {...field} />
        <ProjectDetailsLabelsField {...field} />
        <ProjectDetailsDatesField {...field} />
      </div>
    </>
  )
}
