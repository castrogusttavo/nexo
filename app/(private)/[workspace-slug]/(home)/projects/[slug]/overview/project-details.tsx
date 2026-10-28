import { PanelLeftIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  DetailsPanel,
  type DetailsPanelTab,
} from '@/components/layouts/details-panel'

export const PROJECT_DETAILS_ID = 'project-details'

function ProjectDetailsProperties() {
  return (
    <>
      <h2>Propriedades</h2>
      <form>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Estado</p>
          </div>
          {/* project-state dropdown */}
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Prioridade</p>
          </div>
          {/* project-priority dropdown */}
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Líder</p>
          </div>
          {/* project-lead dropdown */}
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Membros</p>
          </div>
          <div>1 membro(s)</div>
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Etiquetas</p>
          </div>
          {/* project-labels dropdown */}
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Data de início</p>
          </div>
          {/* project-start-date dropdown */}
        </div>
        <div>
          <div>
            <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            <p>Data de conclusão</p>
          </div>
          {/* project-due-date dropdown */}
        </div>
      </form>
    </>
  )
}

const PROJECT_DETAILS_TABS: DetailsPanelTab[] = [
  {
    value: 'properties',
    label: 'Propriedades',
    icon: PanelLeftIcon,
    content: <ProjectDetailsProperties />,
  },
  {
    value: 'updates',
    label: 'Atualizações',
    icon: PanelLeftIcon,
    content: '…',
  },
  { value: 'activity', label: 'Atividade', icon: PanelLeftIcon, content: '…' },
]

export function ProjectDetails({ open }: { open: boolean }) {
  return (
    <DetailsPanel
      id={PROJECT_DETAILS_ID}
      label='Detalhes do projeto'
      open={open}
      tabs={PROJECT_DETAILS_TABS}
    />
  )
}
