import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { WorkspaceService } from '@/src/services/workspace.service'

vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/cache/workspace.cache')
vi.mock('@/src/cache/user.cache')

import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'

const mockedWorkspaceRepo = vi.mocked(WorkspaceRepository)
const mockedMembershipRepo = vi.mocked(MembershipRepository)
const mockedWorkspaceCache = vi.mocked(WorkspaceCache)
const mockedUserCache = vi.mocked(UserCache)

describe('WorkspaceService', () => {
  describe('getById()', () => {
    it('should return workspace from cache when membership exists', async () => {
      const membership = createFakeMembership({
        userId: 'u1',
        workspaceId: 'ws1',
        role: 'MEMBER',
      })
      const workspace = createFakeWorkspace({ id: 'ws1', name: 'Cached' })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceCache.get.mockResolvedValue({
        ...workspace,
        trialEndsAt: workspace?.trialEndsAt?.toISOString() ?? null,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      })

      const result = await WorkspaceService.getById('u1', 'ws1')

      const value = expectOk(result)
      expect(value.id).toBe('ws1')
      expect(mockedWorkspaceRepo.findById).not.toHaveBeenCalled()
    })

    it('should fetch from repo and populate cache on miss', async () => {
      const membership = createFakeMembership({
        userId: 'u1',
        workspaceId: 'ws1',
      })
      const workspace = createFakeWorkspace({ id: 'ws1', name: 'Fresh' })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceCache.get.mockResolvedValue(null)
      mockedWorkspaceRepo.findById.mockResolvedValue(ok(workspace))
      mockedWorkspaceCache.set.mockResolvedValue(undefined)

      const result = await WorkspaceService.getById('u1', 'ws1')

      const value = expectOk(result)
      expect(value.name).toBe('Fresh')
      expect(mockedWorkspaceCache.set).toHaveBeenCalledWith(
        'ws1',
        expect.objectContaining({ id: 'ws1' }),
      )
    })

    it('should return forbidden when user is not a member', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WorkspaceService.getById('u1', 'ws1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedWorkspaceCache.get).not.toHaveBeenCalled()
      expect(mockedWorkspaceRepo.findById).not.toHaveBeenCalled()
    })

    it('should propagate membership lookup error', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await WorkspaceService.getById('u1', 'ws1')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should propagate repo error on cache miss', async () => {
      const membership = createFakeMembership({
        userId: 'u1',
        workspaceId: 'ws1',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceCache.get.mockResolvedValue(null)
      mockedWorkspaceRepo.findById.mockResolvedValue(err(databaseError()))

      const result = await WorkspaceService.getById('u1', 'ws1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('create()', () => {
    it('should create workspace and invalidate user cache', async () => {
      const workspace = createFakeWorkspace({ name: 'Acme', slug: 'acme' })

      mockedWorkspaceRepo.createWithOwner.mockResolvedValue(ok(workspace))
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await WorkspaceService.create('owner-1', {
        name: 'Acme',
        slug: 'acme',
      })

      const value = expectOk(result)
      expect(value.slug).toBe('acme')
      expect(mockedWorkspaceRepo.createWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme',
          slug: 'acme',
          activePlan: 'BUSINESS',
          trialEndsAt: expect.any(Date),
        }),
        'owner-1',
      )
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('owner-1')
    })

    it('should propagate repo error and skip cache invalidation', async () => {
      mockedWorkspaceRepo.createWithOwner.mockResolvedValue(
        err(databaseError()),
      )

      const result = await WorkspaceService.create('owner-1', {
        name: 'Acme',
        slug: 'acme',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedUserCache.invalidate).not.toHaveBeenCalled()
    })

    it('should grant a 14-day business trial on creation', async () => {
      mockedWorkspaceRepo.createWithOwner.mockResolvedValue(
        ok(createFakeWorkspace()),
      )
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const before = Date.now()
      await WorkspaceService.create('owner-1', { name: 'A', slug: 'a' })
      const { trialEndsAt, activePlan } =
        mockedWorkspaceRepo.createWithOwner.mock.calls[0][0]

      expect(activePlan).toBe('BUSINESS')
      expect(trialEndsAt).toBeInstanceOf(Date)
      if (trialEndsAt instanceof Date) {
        const days = (trialEndsAt.getTime() - before) / 86_400_000
        expect(days).toBeGreaterThan(13.9)
        expect(days).toBeLessThan(14.1)
      }
    })
  })

  describe('update()', () => {
    it('should allow OWNER to update', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      const updated = createFakeWorkspace({ id: 'ws1', name: 'Renamed' })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceRepo.update.mockResolvedValue(ok(updated))
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await WorkspaceService.update('owner', 'ws1', {
        name: 'Renamed',
      })

      const value = expectOk(result)
      expect(value.name).toBe('Renamed')
      expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws1')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('owner')
    })

    it('should allow ADMIN to update', async () => {
      const membership = createFakeMembership({
        userId: 'admin',
        workspaceId: 'ws1',
        role: 'ADMIN',
      })
      const updated = createFakeWorkspace({ id: 'ws1' })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceRepo.update.mockResolvedValue(ok(updated))
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await WorkspaceService.update('admin', 'ws1', {
        name: 'X',
      })

      expectOk(result)
    })

    it('should forbid MEMBER from updating', async () => {
      const membership = createFakeMembership({
        userId: 'm1',
        workspaceId: 'ws1',
        role: 'MEMBER',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )

      const result = await WorkspaceService.update('m1', 'ws1', { name: 'X' })

      const error = expectErr(result, 'FORBIDDEN')
      expect(error.message).toContain('OWNER ou ADMIN')
      expect(mockedWorkspaceRepo.update).not.toHaveBeenCalled()
    })

    it('should forbid VIEWER from updating', async () => {
      const membership = createFakeMembership({
        userId: 'v1',
        workspaceId: 'ws1',
        role: 'VIEWER',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )

      const result = await WorkspaceService.update('v1', 'ws1', { name: 'X' })

      expectErr(result, 'FORBIDDEN')
    })

    it('should forbid non-member from updating', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WorkspaceService.update('outsider', 'ws1', {
        name: 'X',
      })

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate membership lookup error', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await WorkspaceService.update('owner', 'ws1', {
        name: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWorkspaceRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceRepo.update.mockResolvedValue(err(databaseError()))

      const result = await WorkspaceService.update('owner', 'ws1', {
        name: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
    })
  })

  describe('delete()', () => {
    it('should allow OWNER to delete and invalidate caches', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceRepo.delete.mockResolvedValue(ok(undefined))
      mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)
      mockedUserCache.invalidate.mockResolvedValue(undefined)

      const result = await WorkspaceService.delete('owner', 'ws1')

      expectOk(result)
      expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws1')
      expect(mockedUserCache.invalidate).toHaveBeenCalledWith('owner')
    })

    it('should forbid ADMIN from deleting', async () => {
      const membership = createFakeMembership({
        userId: 'admin',
        workspaceId: 'ws1',
        role: 'ADMIN',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )

      const result = await WorkspaceService.delete('admin', 'ws1')

      const error = expectErr(result, 'FORBIDDEN')
      expect(error.message).toContain('OWNER')
      expect(mockedWorkspaceRepo.delete).not.toHaveBeenCalled()
    })

    it('should forbid non-member from deleting', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WorkspaceService.delete('outsider', 'ws1')

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate delete error', async () => {
      const membership = createFakeMembership({
        userId: 'owner',
        workspaceId: 'ws1',
        role: 'OWNER',
      })

      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        ok(membership),
      )
      mockedWorkspaceRepo.delete.mockResolvedValue(err(databaseError()))

      const result = await WorkspaceService.delete('owner', 'ws1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
    })

    it('should propagate membership lookup error', async () => {
      mockedMembershipRepo.findByUserAndWorkspace.mockResolvedValue(
        err(databaseError()),
      )

      const result = await WorkspaceService.delete('owner', 'ws1')

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWorkspaceRepo.delete).not.toHaveBeenCalled()
    })
  })
})
