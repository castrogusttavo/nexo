import {
  MultiplicationSignSquareIcon,
  SquareCheckIcon,
  SquareStopIcon,
} from '@hugeicons-pro/core-solid-rounded'
import {
  BorderAll01Icon,
  type CircleDotIcon,
  FullScreenIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ProjectStateGroupDTO } from '@/types/project-state'
import type { StateColorDTO } from '@/types/state'

// A project's lifecycle in display order: the settings page lists the
// groups this way and the state picker groups its options the same way.
// `defaultColor` matches the seeded state of each group.
export const projectStateGroups: Array<{
  group: ProjectStateGroupDTO
  label: string
  icon: typeof CircleDotIcon
  strokeWidth?: number
  defaultColor: StateColorDTO
}> = [
  {
    group: 'DRAFT',
    label: 'Rascunho',
    icon: FullScreenIcon,
    strokeWidth: 2,
    defaultColor: 'ZINC',
  },
  {
    group: 'PLANNING',
    label: 'Planejamento',
    icon: BorderAll01Icon,
    strokeWidth: 2,
    defaultColor: 'ZINC',
  },
  {
    group: 'EXECUTION',
    label: 'Execução',
    icon: BorderAll01Icon,
    strokeWidth: 2,
    defaultColor: 'YELLOW',
  },
  {
    group: 'MONITORING',
    label: 'Monitoramento',
    icon: SquareStopIcon,
    defaultColor: 'BLUE',
  },
  {
    group: 'COMPLETED',
    label: 'Concluído',
    icon: SquareCheckIcon,
    defaultColor: 'GREEN',
  },
  {
    group: 'CANCELLED',
    label: 'Cancelado',
    icon: MultiplicationSignSquareIcon,
    defaultColor: 'ZINC',
  },
]

export const projectStateGroupMeta = Object.fromEntries(
  projectStateGroups.map((item) => [item.group, item]),
) as Record<ProjectStateGroupDTO, (typeof projectStateGroups)[number]>
