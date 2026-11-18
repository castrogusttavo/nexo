import type {
  ProjectProgressDTO,
  StateGroupKey,
} from '@/types/project-progress'

const GROUP_ORDER: StateGroupKey[] = [
  'BACKLOG',
  'UNSTARTED',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
]

const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100)

export function buildProjectProgress(
  rows: { group: StateGroupKey; count: number }[],
): ProjectProgressDTO {
  const counts = new Map<StateGroupKey, number>(GROUP_ORDER.map((g) => [g, 0]))
  for (const { group, count } of rows) {
    counts.set(group, (counts.get(group) ?? 0) + count)
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const completed = counts.get('COMPLETED') ?? 0
  const cancelled = counts.get('CANCELLED') ?? 0

  return {
    total,
    // Cancelled issues are not work left to do, so they leave the base.
    completionPercentage: percent(completed, total - cancelled),
    groups: GROUP_ORDER.map((group) => {
      const count = counts.get(group) ?? 0
      return { group, count, percentage: percent(count, total) }
    }),
  }
}
