import {
  Activity01Icon,
  InfoIcon,
  ZapIcon,
} from '@hugeicons-pro/core-solid-rounded'
import {
  DetailsPanel,
  type DetailsPanelTab,
} from '@/components/layouts/details-panel'
import { ProjectDetailsProperties } from './properties/project-details-properties'
import { ProjectDetailsUpdates } from './updates/project-details-updates'

export const PROJECT_DETAILS_ID = 'project-details'

export function ProjectDetails({
  open,
  workspaceId,
  projectSlug,
  canManage,
  projectStatesEnabled,
}: {
  open: boolean
  workspaceId: string
  projectSlug: string
  canManage: boolean
  projectStatesEnabled: boolean
}) {
  const tabs: DetailsPanelTab[] = [
    {
      value: 'properties',
      label: 'Propriedades',
      icon: InfoIcon,
      content: (
        <ProjectDetailsProperties
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          canManage={canManage}
          projectStatesEnabled={projectStatesEnabled}
        />
      ),
    },
    {
      value: 'updates',
      label: 'Atualizações',
      icon: ZapIcon,
      content: (
        <ProjectDetailsUpdates projectStatesEnabled={projectStatesEnabled} />
      ),
    },
    {
      value: 'activity',
      label: 'Atividade',
      icon: Activity01Icon,
      content: '...',
    },
  ]

  return (
    <DetailsPanel
      id={PROJECT_DETAILS_ID}
      label='Detalhes do projeto'
      open={open}
      tabs={tabs}
    />
  )
}
