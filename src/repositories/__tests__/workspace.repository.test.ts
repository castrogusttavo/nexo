import { describe, expect, it } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'

describe('WorkspaceRepository', () => {
  describe('findById()', () => {
    it('should return workspace when it exists', async () => {
      const seeded = await seedWorkspace({ name: 'Acme', slug: 'acme-co' })

      const result = await WorkspaceRepository.findById(seeded.id)

      const ws = expectOk(result)
      expect(ws.id).toBe(seeded.id)
      expect(ws.name).toBe('Acme')
    })

    it('should return RESOURCE_NOT_FOUND when workspace does not exist', async () => {
      const result = await WorkspaceRepository.findById('nonexistent')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('findBySlug()', () => {
    it('should return workspace when slug matches', async () => {
      const seeded = await seedWorkspace({ slug: 'unique-slug' })

      const result = await WorkspaceRepository.findBySlug('unique-slug')

      const ws = expectOk(result)
      expect(ws?.id).toBe(seeded.id)
    })

    it('should return null when slug does not exist', async () => {
      const result = await WorkspaceRepository.findBySlug('ghost-slug')

      const ws = expectOk(result)
      expect(ws).toBeNull()
    })
  })

  describe('create()', () => {
    it('should persist workspace with default plan BASIC', async () => {
      const result = await WorkspaceRepository.create({
        name: 'New WS',
        slug: 'new-ws',
      })

      const ws = expectOk(result)
      expect(ws.name).toBe('New WS')
      expect(ws.slug).toBe('new-ws')
      expect(ws.activePlan).toBe('BASIC')
    })

    it('should return CONFLICT when slug is already taken', async () => {
      await seedWorkspace({ slug: 'dup-slug' })

      const result = await WorkspaceRepository.create({
        name: 'Other',
        slug: 'dup-slug',
      })

      const error = expectErr(result, 'CONFLICT')
      expect(error.message).toContain('Slug')
    })
  })

  describe('createWithOwner()', () => {
    it('should create workspace and OWNER membership atomically', async () => {
      const owner = await seedUser({ email: 'owner@example.com' })

      const result = await WorkspaceRepository.createWithOwner(
        { name: 'Acme', slug: 'acme-with-owner' },
        owner.id,
      )

      const ws = expectOk(result)
      expect(ws.slug).toBe('acme-with-owner')

      const membership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: owner.id, workspaceId: ws.id } },
      })
      expect(membership).not.toBeNull()
      expect(membership?.role).toBe('OWNER')
    })

    it('should rollback workspace when membership cannot be created', async () => {
      const result = await WorkspaceRepository.createWithOwner(
        { name: 'Orphan', slug: 'orphan-ws' },
        'nonexistent-user-id',
      )

      expectErr(result, 'DATABASE_ERROR')

      const ws = await prisma.workspace.findUnique({
        where: { slug: 'orphan-ws' },
      })
      expect(ws).toBeNull()
    })

    it('should return CONFLICT when slug is taken', async () => {
      const owner = await seedUser({ email: 'conf@example.com' })
      await seedWorkspace({ slug: 'conflict-slug' })

      const result = await WorkspaceRepository.createWithOwner(
        { name: 'X', slug: 'conflict-slug' },
        owner.id,
      )

      expectErr(result, 'CONFLICT')
    })
  })

  describe('update()', () => {
    it('should update workspace name', async () => {
      const seeded = await seedWorkspace({ name: 'Old' })

      const result = await WorkspaceRepository.update(seeded.id, {
        name: 'New',
      })

      const ws = expectOk(result)
      expect(ws.name).toBe('New')
    })

    it('should return CONFLICT when updating to a taken slug', async () => {
      await seedWorkspace({ slug: 'taken' })
      const target = await seedWorkspace({ slug: 'movable' })

      const result = await WorkspaceRepository.update(target.id, {
        slug: 'taken',
      })

      expectErr(result, 'CONFLICT')
    })
  })

  describe('delete()', () => {
    it('should remove workspace', async () => {
      const seeded = await seedWorkspace()

      const result = await WorkspaceRepository.delete(seeded.id)

      expectOk(result)
      const ws = await prisma.workspace.findUnique({ where: { id: seeded.id } })
      expect(ws).toBeNull()
    })

    it('should return DATABASE_ERROR when workspace does not exist', async () => {
      const result = await WorkspaceRepository.delete('nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
