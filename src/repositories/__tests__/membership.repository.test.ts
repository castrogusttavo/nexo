import { describe, expect, it } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { MembershipRepository } from '@/src/repositories/membership.repository'

describe('MembershipRepository', () => {
  describe('findByUserAndWorkspace()', () => {
    it('should return membership when it exists', async () => {
      const [user, ws] = await Promise.all([
        seedUser({ email: 'u1@example.com' }),
        seedWorkspace(),
      ])
      await seedMembership({
        userId: user.id,
        workspaceId: ws.id,
        role: 'OWNER',
      })

      const result = await MembershipRepository.findByUserAndWorkspace(
        user.id,
        ws.id,
      )

      const m = expectOk(result)
      expect(m).not.toBeNull()
      expect(m?.role).toBe('OWNER')
    })

    it('should return null when membership does not exist', async () => {
      const result = await MembershipRepository.findByUserAndWorkspace(
        'no-user',
        'no-ws',
      )

      const m = expectOk(result)
      expect(m).toBeNull()
    })
  })

  describe('findByUserAndSlug()', () => {
    it('should return membership including workspace when slug matches', async () => {
      const [user, ws] = await Promise.all([
        seedUser({ email: 'u2@example.com' }),
        seedWorkspace({ slug: 'lookup-slug' }),
      ])
      await seedMembership({ userId: user.id, workspaceId: ws.id })

      const result = await MembershipRepository.findByUserAndSlug(
        user.id,
        'lookup-slug',
      )

      const m = expectOk(result)
      expect(m?.workspace.id).toBe(ws.id)
      expect(m?.workspace.slug).toBe('lookup-slug')
    })

    it('should return null when slug does not match user memberships', async () => {
      const user = await seedUser({ email: 'u3@example.com' })

      const result = await MembershipRepository.findByUserAndSlug(
        user.id,
        'unknown-slug',
      )

      const m = expectOk(result)
      expect(m).toBeNull()
    })
  })

  describe('listByUser()', () => {
    it('should list all memberships for a user including workspaces', async () => {
      const [user, wsA, wsB] = await Promise.all([
        seedUser({ email: 'u4@example.com' }),
        seedWorkspace({ slug: 'list-a' }),
        seedWorkspace({ slug: 'list-b' }),
      ])
      await seedMembership({ userId: user.id, workspaceId: wsA.id })
      await seedMembership({ userId: user.id, workspaceId: wsB.id })

      const result = await MembershipRepository.listByUser(user.id)

      const memberships = expectOk(result)
      expect(memberships).toHaveLength(2)
      expect(memberships.map((m) => m.workspace.slug).sort()).toEqual([
        'list-a',
        'list-b',
      ])
    })

    it('should return empty array when user has no memberships', async () => {
      const user = await seedUser({ email: 'u5@example.com' })

      const result = await MembershipRepository.listByUser(user.id)

      expect(expectOk(result)).toEqual([])
    })
  })

  describe('create()', () => {
    it('should default to MEMBER role', async () => {
      const [user, ws] = await Promise.all([
        seedUser({ email: 'u6@example.com' }),
        seedWorkspace(),
      ])

      const result = await MembershipRepository.create({
        userId: user.id,
        workspaceId: ws.id,
      })

      const m = expectOk(result)
      expect(m.role).toBe('MEMBER')
    })

    it('should accept custom role', async () => {
      const [user, ws] = await Promise.all([
        seedUser({ email: 'u7@example.com' }),
        seedWorkspace(),
      ])

      const result = await MembershipRepository.create({
        userId: user.id,
        workspaceId: ws.id,
        role: 'ADMIN',
      })

      const m = expectOk(result)
      expect(m.role).toBe('ADMIN')
    })

    it('should return DATABASE_ERROR on duplicate (user, workspace)', async () => {
      const [user, ws] = await Promise.all([
        seedUser({ email: 'u8@example.com' }),
        seedWorkspace(),
      ])
      await seedMembership({ userId: user.id, workspaceId: ws.id })

      const result = await MembershipRepository.create({
        userId: user.id,
        workspaceId: ws.id,
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
