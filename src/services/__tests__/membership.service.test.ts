import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { MembershipService } from '../membership.service'

vi.mock('@/src/repositories/membership.repository')

const mockedMembership = vi.mocked(MembershipRepository)

const membershipWithWorkspace = {
  ...createFakeMembership({ userId: 'user1', workspaceId: 'ws1' }),
  workspace: createFakeWorkspace({ id: 'ws1', slug: 'acme' }),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MembershipService', () => {
  describe('getByUserAndSlug()', () => {
    it('should return the membership scoped to the user and slug', async () => {
      mockedMembership.findByUserAndSlug.mockResolvedValue(
        ok(membershipWithWorkspace),
      )

      const result = await MembershipService.getByUserAndSlug('user1', 'acme')

      expect(expectOk(result)?.workspaceId).toBe('ws1')
      expect(mockedMembership.findByUserAndSlug).toHaveBeenCalledWith(
        'user1',
        'acme',
      )
    })

    it('should propagate a repository error', async () => {
      mockedMembership.findByUserAndSlug.mockResolvedValue(
        err(databaseError('boom')),
      )

      const result = await MembershipService.getByUserAndSlug('user1', 'acme')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('listByUser()', () => {
    it('should return every membership of the user', async () => {
      mockedMembership.listByUser.mockResolvedValue(
        ok([membershipWithWorkspace]),
      )

      const result = await MembershipService.listByUser('user1')

      expect(expectOk(result)).toHaveLength(1)
      expect(mockedMembership.listByUser).toHaveBeenCalledWith('user1')
    })
  })

  describe('countByWorkspace()', () => {
    it('should return the workspace member count', async () => {
      mockedMembership.countByWorkspace.mockResolvedValue(ok(3))

      const result = await MembershipService.countByWorkspace('ws1')

      expect(expectOk(result)).toBe(3)
      expect(mockedMembership.countByWorkspace).toHaveBeenCalledWith('ws1')
    })
  })
})
