import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons-pro/core-solid-rounded'
import {
  AlertCircleIcon,
  CancelCircleHalfDotIcon,
  CircleDotDashedIcon,
  CircleDotIcon,
  ClockPlusIcon,
  DashedLineCircleIcon,
  DiceFaces04Icon,
  Edit02Icon,
  FullSignalIcon,
  GitBranchIcon,
  HierarchySquare01Icon,
  HistoryIcon,
  LowSignalIcon,
  MediumSignalIcon,
  RotateCcwSquareIcon,
  SignalNo02Icon,
  Tag01Icon,
  WorkflowSquare04Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { CycleStatusDTO } from '@/types/cycle'
import type {
  IssueDependencyDTO,
  IssueDependencyTypeDTO,
  IssuePriorityDTO,
} from '@/types/issue'
import type { StateGroupDTO } from '@/types/state'

export const issueModulesIcon = DiceFaces04Icon

export const issueRelationsIcon = RotateCcwSquareIcon

export const subIssueIcon = WorkflowSquare04Icon

export const issueParentIcon = HierarchySquare01Icon

export const issueLabelIcon = Tag01Icon

export const issueHistoryIcon = HistoryIcon

export const issueBranchIcon = GitBranchIcon

export const issueCreatedBy = ClockPlusIcon

export const issueUpdateAtIcon = Edit02Icon

export type IssueDependencyDisplayType =
  | 'BLOCKED_BY'
  | 'BLOCKING'
  | 'STARTS_BEFORE'
  | 'STARTS_AFTER'
  | 'FINISHES_BEFORE'
  | 'FINISHES_AFTER'

export const issueDependenciesIcon: Array<{
  type: IssueDependencyDisplayType
  label: string
  icon: typeof CircleDotIcon
  strokeWidth?: number
}> = [
  {
    type: 'BLOCKED_BY',
    label: 'Bloqueado por',
    icon: CircleDotIcon,
    strokeWidth: 2,
  },
  {
    type: 'BLOCKING',
    label: 'Bloqueando',
    icon: CancelCircleHalfDotIcon,
    strokeWidth: 2,
  },
  {
    type: 'STARTS_BEFORE',
    label: 'Inicia antes',
    icon: CircleDotIcon,
    strokeWidth: 2,
  },
  {
    type: 'STARTS_AFTER',
    label: 'Inicia depois',
    icon: CancelCircleIcon,
    strokeWidth: 2,
  },
  {
    type: 'FINISHES_BEFORE',
    label: 'Termina antes',
    icon: CircleDotIcon,
    strokeWidth: 2,
  },
  {
    type: 'FINISHES_AFTER',
    label: 'Termina depois',
    icon: CancelCircleIcon,
    strokeWidth: 2,
  },
]

// The 3 display types reachable when the current issue is the dependency's source —
// the only ones selectable when creating a new dependency (always created from the current issue).
export const ISSUE_DEPENDENCY_OUTBOUND_TYPES: IssueDependencyDisplayType[] = [
  'BLOCKING',
  'STARTS_BEFORE',
  'FINISHES_BEFORE',
]

export const ISSUE_DEPENDENCY_DISPLAY_TO_DB: Record<
  IssueDependencyDisplayType,
  IssueDependencyTypeDTO
> = {
  BLOCKING: 'BLOCKS',
  BLOCKED_BY: 'BLOCKS',
  STARTS_BEFORE: 'STARTS_BEFORE',
  STARTS_AFTER: 'STARTS_BEFORE',
  FINISHES_BEFORE: 'FINISHES_BEFORE',
  FINISHES_AFTER: 'FINISHES_BEFORE',
}

// Direction isn't stored in the DB — it's derived from whether the current issue
// is the dependency's sourceId or targetId.
export function resolveDependencyDisplayType(
  dependency: Pick<IssueDependencyDTO, 'type' | 'sourceId'>,
  currentIssueId: string,
): IssueDependencyDisplayType {
  const isSource = dependency.sourceId === currentIssueId
  if (dependency.type === 'BLOCKS') return isSource ? 'BLOCKING' : 'BLOCKED_BY'
  if (dependency.type === 'STARTS_BEFORE')
    return isSource ? 'STARTS_BEFORE' : 'STARTS_AFTER'
  return isSource ? 'FINISHES_BEFORE' : 'FINISHES_AFTER'
}

export const issueCyclesIcon: Array<{
  status: CycleStatusDTO
  icon: typeof CircleDotIcon
  color: string
  strokeWidth?: number
}> = [
  {
    status: 'NOT_STARTED',
    icon: CircleDotIcon,
    color: 'text-zinc-500',
    strokeWidth: 2,
  },
  {
    status: 'IN_PROGRESS',
    icon: CircleDotIcon,
    color: 'text-yellow-500',
    strokeWidth: 2,
  },
  { status: 'COMPLETED', icon: CheckmarkCircle02Icon, color: 'text-green-500' },
]

export const issueStatesIcon: Array<{
  state: StateGroupDTO
  label: string
  icon: typeof CircleDotIcon
  strokeWidth?: number
}> = [
  {
    state: 'BACKLOG',
    label: 'Backlog',
    icon: DashedLineCircleIcon,
    strokeWidth: 2,
  },
  {
    state: 'UNSTARTED',
    label: 'Não iniciado',
    icon: CircleDotDashedIcon,
    strokeWidth: 2,
  },
  {
    state: 'STARTED',
    label: 'Em progresso',
    icon: CircleDotIcon,
    strokeWidth: 2,
  },
  { state: 'COMPLETED', label: 'Concluído', icon: CheckmarkCircle02Icon },
  { state: 'CANCELLED', label: 'Cancelado', icon: CancelCircleIcon },
]

export const issueStateIconMap: Record<
  StateGroupDTO,
  (typeof issueStatesIcon)[number]
> = Object.fromEntries(
  issueStatesIcon.map((item) => [item.state, item]),
) as Record<StateGroupDTO, (typeof issueStatesIcon)[number]>

export const issuePrioritiesIcon: Array<{
  priority: IssuePriorityDTO
  label: string
  icon: typeof SignalNo02Icon
  color: string
  strokeWidth?: number
}> = [
  {
    priority: 'NONE',
    label: 'Nenhum',
    icon: SignalNo02Icon,
    color: 'text-zinc-500',
    strokeWidth: 2,
  },
  {
    priority: 'LOW',
    label: 'Baixa',
    icon: LowSignalIcon,
    color: 'text-blue-500',
    strokeWidth: 2,
  },
  {
    priority: 'MEDIUM',
    label: 'Média',
    icon: MediumSignalIcon,
    color: 'text-yellow-500',
    strokeWidth: 2,
  },
  {
    priority: 'HIGH',
    label: 'Alta',
    icon: FullSignalIcon,
    color: 'text-orange-500',
    strokeWidth: 2,
  },
  {
    priority: 'URGENT',
    label: 'Urgente',
    icon: AlertCircleIcon,
    color: 'text-red-500',
    strokeWidth: 2,
  },
]
