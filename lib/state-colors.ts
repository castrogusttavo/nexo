import type { StateColorDTO, StateGroupDTO } from '@/types/state'

export const STATE_COLORS: Array<{ value: StateColorDTO; bg: string; text: string }> = [
  { value: 'RED', bg: 'bg-red-500', text: 'text-red-500' },
  { value: 'YELLOW', bg: 'bg-yellow-500', text: 'text-yellow-500' },
  { value: 'BLUE', bg: 'bg-blue-500', text: 'text-blue-500' },
  { value: 'GREEN', bg: 'bg-green-500', text: 'text-green-500' },
  { value: 'PURPLE', bg: 'bg-purple-500', text: 'text-purple-500' },
  { value: 'ZINC', bg: 'bg-zinc-500', text: 'text-zinc-500' },
]

export function colorToDot(color: StateColorDTO): string {
  return STATE_COLORS.find((c) => c.value === color)?.bg ?? 'bg-zinc-500'
}

export function colorToText(color: StateColorDTO): string {
  return STATE_COLORS.find((c) => c.value === color)?.text ?? 'text-zinc-500'
}

export const STATE_GROUP_DEFAULT_COLOR: Record<StateGroupDTO, StateColorDTO> = {
  BACKLOG: 'ZINC',
  UNSTARTED: 'ZINC',
  STARTED: 'YELLOW',
  COMPLETED: 'GREEN',
  CANCELLED: 'RED',
}
