import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons-pro/core-solid-rounded'
import {
  CircleDotIcon,
  DashedLineCircleIcon,
  StatusIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { StateGroupDTO } from "@/types/state"

export const STATE_GROUP: Array<{
  value: StateGroupDTO
  label: string
  icon: typeof DashedLineCircleIcon,
  strokeWidth?: number
}> = [
  { value: 'BACKLOG', label: 'Backlog', icon: DashedLineCircleIcon, strokeWidth: 2 },
  { value: 'UNSTARTED', label: 'Não iniciado', icon: StatusIcon, strokeWidth: 2 },
  { value: 'STARTED', label: 'Em progresso', icon: CircleDotIcon, strokeWidth: 2 },
  { value: 'COMPLETED', label: 'Concluído', icon: CheckmarkCircle02Icon },
  { value: 'CANCELLED', label: 'Cancelado', icon: CancelCircleIcon },
]

export const STATE_GROUP_ICON_MAP: Record<StateGroupDTO, (typeof STATE_GROUP)[number]> = Object.fromEntries(
  STATE_GROUP.map((group) => [group.value, group]),
) as Record<StateGroupDTO, (typeof STATE_GROUP)[number]>
