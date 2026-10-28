import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  CircleDotDashedIcon,
  type CircleDotIcon,
  DashedLineCircleIcon,
  Radar01Icon,
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
    icon: DashedLineCircleIcon,
    strokeWidth: 2,
    defaultColor: 'ZINC',
  },
  {
    group: 'PLANNING',
    label: 'Planejamento',
    icon: CircleDotDashedIcon,
    strokeWidth: 2,
    defaultColor: 'ZINC',
  },
  {
    group: 'MONITORING',
    label: 'Monitoramento',
    icon: Radar01Icon,
    strokeWidth: 2,
    defaultColor: 'PURPLE',
  },
  {
    group: 'COMPLETED',
    label: 'Concluído',
    icon: CheckmarkCircle02Icon,
    defaultColor: 'GREEN',
  },
  {
    group: 'CANCELLED',
    label: 'Cancelado',
    icon: CancelCircleIcon,
    defaultColor: 'RED',
  },
]

export const projectStateGroupMeta = Object.fromEntries(
  projectStateGroups.map((item) => [item.group, item]),
) as Record<ProjectStateGroupDTO, (typeof projectStateGroups)[number]>
