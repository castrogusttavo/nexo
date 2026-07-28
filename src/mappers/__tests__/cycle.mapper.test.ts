import { describe, expect, it } from 'vitest'
import { createFakeCycle } from '@/src/__tests__/factories/cycle.factory'
import type { CycleMemberWithUser } from '../../repositories/cycle.repository'
import { toCycleDTO, toCycleMemberDTO } from '../cycle.mapper'

describe('toCycleDTO', () => {
  it('should map all fields correctly', () => {
    const now = new Date('2025-03-01T10:00:00.000Z')
    const startDate = new Date('2025-01-01T00:00:00.000Z')
    const endDate = new Date('2025-01-15T00:00:00.000Z')
    const cycle = createFakeCycle({
      id: 'cyc-1',
      name: 'Sprint 1',
      description: 'First sprint',
      status: 'IN_PROGRESS',
      startDate,
      endDate,
      leadId: 'user-1',
      projectId: 'proj-1',
      createdAt: now,
      updatedAt: now,
    })

    const dto = toCycleDTO(cycle)

    expect(dto).toEqual({
      id: 'cyc-1',
      name: 'Sprint 1',
      description: 'First sprint',
      status: 'IN_PROGRESS',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-15T00:00:00.000Z',
      leadId: 'user-1',
      projectId: 'proj-1',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should return null for description and dates when not set', () => {
    const cycle = createFakeCycle({
      description: null,
      startDate: null,
      endDate: null,
    })

    const dto = toCycleDTO(cycle)

    expect(dto.description).toBeNull()
    expect(dto.startDate).toBeNull()
    expect(dto.endDate).toBeNull()
  })
})

describe('toCycleMemberDTO', () => {
  const now = new Date('2025-03-01T10:00:00.000Z')

  function buildMember(
    overrides: Partial<CycleMemberWithUser> = {},
  ): CycleMemberWithUser {
    return {
      cycleId: 'cyc-1',
      userId: 'user-1',
      createdAt: now,
      user: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
      ...overrides,
    } as CycleMemberWithUser
  }

  it('should map all fields correctly and flag the lead', () => {
    const member = buildMember()

    const dto = toCycleMemberDTO(member, 'user-1')

    expect(dto).toEqual({
      userId: 'user-1',
      name: 'Ana',
      username: 'Ana',
      image: null,
      isLead: true,
      createdAt: '2025-03-01T10:00:00.000Z',
    })
  })

  it('should not flag a non-lead member', () => {
    const member = buildMember({ userId: 'user-2' })

    const dto = toCycleMemberDTO(member, 'user-1')

    expect(dto.isLead).toBe(false)
  })

  it('should fall back to null when the user has no image', () => {
    const member = buildMember({
      user: { id: 'user-1', name: 'Ana', username: 'ana', image: null },
    })

    const dto = toCycleMemberDTO(member, 'user-1')

    expect(dto.image).toBeNull()
  })
})
