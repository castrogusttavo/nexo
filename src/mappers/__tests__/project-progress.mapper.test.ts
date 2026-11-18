import { describe, expect, it } from 'vitest'
import { buildProjectProgress } from '@/src/mappers/project-progress.mapper'

const row = (group: string, count: number) => ({ group, count }) as never

describe('buildProjectProgress', () => {
  it('should return the five groups in order, zeroed, without issues', () => {
    const result = buildProjectProgress([])

    expect(result.total).toBe(0)
    expect(result.completionPercentage).toBe(0)
    expect(result.groups.map((g) => g.group)).toEqual([
      'BACKLOG',
      'UNSTARTED',
      'STARTED',
      'COMPLETED',
      'CANCELLED',
    ])
    expect(
      result.groups.every((g) => g.count === 0 && g.percentage === 0),
    ).toBe(true)
  })

  it('should compute count and percentage per group (3 of 7 = 43%)', () => {
    const result = buildProjectProgress([row('STARTED', 1), row('STARTED', 2)])

    expect(result.groups[2].count).toBe(3)
  })

  it('should leave cancelled issues out of the completion percentage', () => {
    const result = buildProjectProgress([
      row('COMPLETED', 1),
      row('STARTED', 1),
      row('CANCELLED', 2),
    ])

    // 1 / (4 - 2) = 50%, while the group percentages still use the total of 4.
    expect(result.completionPercentage).toBe(50)
    expect(result.groups[4].percentage).toBe(50)
  })

  it('should return 0 completion when everything is cancelled', () => {
    expect(
      buildProjectProgress([row('CANCELLED', 2)]).completionPercentage,
    ).toBe(0)
  })
})
