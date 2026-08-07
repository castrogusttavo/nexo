import { IssuePriorityDTO } from "@/types/issue"
import { MediumSignalIcon, LowSignalIcon, SignalNo02Icon, FullSignalIcon, AlertCircleIcon } from "@hugeicons-pro/core-stroke-rounded"

export const PRIORITY_ICONS: Array<{
  value: IssuePriorityDTO
  label: string
  icon: typeof SignalNo02Icon
}> = [
  { value: 'NONE', label: 'Sem prioridade', icon: SignalNo02Icon },
  { value: 'LOW', label: 'Baixa', icon: LowSignalIcon },
  { value: 'MEDIUM', label: 'Média', icon: MediumSignalIcon },
  { value: 'HIGH', label: 'Alta', icon: FullSignalIcon },
  { value: 'URGENT', label: 'Urgente', icon: AlertCircleIcon },
]
