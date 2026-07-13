import { describe, expect, it } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { toMembershipDTO } from '@/src/mappers/membership.mapper'

describe('toMembershipDTO()', () => {
  it('should map membership fields and nest a workspace DTO', () => {
    const membership = createFakeMembership({
      id: 'mem-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
    })
    const workspace = createFakeWorkspace({ id: 'ws-1', slug: 'acme' })

    const dto = toMembershipDTO({ ...membership, workspace })

    expect(dto).toEqual({
      id: 'mem-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
      workspace: expect.objectContaining({ id: 'ws-1', slug: 'acme' }),
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    })
  })

  it('should serialize the nested workspace trialEndsAt as an ISO string', () => {
    const membership = createFakeMembership()
    const trialEndsAt = new Date('2026-08-01T00:00:00.000Z')
    const workspace = createFakeWorkspace({ trialEndsAt })

    const dto = toMembershipDTO({ ...membership, workspace })

    expect(dto.workspace.trialEndsAt).toBe('2026-08-01T00:00:00.000Z')
  })
})
