import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedStickyNote } from '@/src/__tests__/factories/sticky-note.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { StickyNoteRepository } from '../sticky-note.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StickyNoteRepository', () => {
  describe('findById()', () => {
    it('should return sticky note when it exists', async () => {
      const user = await seedUser()
      const seeded = await seedStickyNote(user.id, { color: 'BLUE' })

      const result = await StickyNoteRepository.findById(seeded.id)

      const sticky = expectOk(result)
      expect(sticky.id).toBe(seeded.id)
      expect(sticky.color).toBe('BLUE')
    })

    it('should return RESOURCE_NOT_FOUND when it does not exist', async () => {
      const result = await StickyNoteRepository.findById('nonexistent')
      expectErr(result, 'RESOURCE_NOT_FOUND')
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.stickyNote, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await StickyNoteRepository.findById('x'), 'DATABASE_ERROR')
    })
  })

  describe('listByUserId()', async () => {
    it('should return all stickies of a user ordered by updatedAt desc', async () => {
      const user = await seedUser()
      const a = await seedStickyNote(user.id)
      await new Promise((resolve) => setTimeout(resolve, 5))
      const b = await seedStickyNote(user.id)

      const result = await StickyNoteRepository.listByUserId(user.id)

      const list = expectOk(result)
      expect(list.map((s) => s.id)).toEqual([b.id, a.id])
    })

    it('should reorder by updatedAt when sticky is updated', async () => {
      const user = await seedUser()
      const a = await seedStickyNote(user.id)
      await new Promise((resolve) => setTimeout(resolve, 5))
      const b = await seedStickyNote(user.id)
      await new Promise((resolve) => setTimeout(resolve, 5))

      await StickyNoteRepository.update(a.id, { color: 'RED' })

      const result = await StickyNoteRepository.listByUserId(user.id)
      const list = expectOk(result)
      expect(list.map((s) => s.id)).toEqual([a.id, b.id])
    })

    it('should not return stickies of other users', async () => {
      const [a, b] = await Promise.all([seedUser(), seedUser()])
      await seedStickyNote(a.id)
      await seedStickyNote(b.id)

      const result = await StickyNoteRepository.listByUserId(a.id)

      const list = expectOk(result)
      expect(list).toHaveLength(1)
      expect(list[0].userId).toBe(a.id)
    })

    it('should return empty array when user has no stickies', async () => {
      const user = await seedUser()

      const result = await StickyNoteRepository.listByUserId(user.id)
      const list = expectOk(result)
      expect(list).toEqual([])
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.stickyNote, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await StickyNoteRepository.listByUserId('u'), 'DATABASE_ERROR')
    })
  })

  describe('create()', () => {
    it('should persist sticky bound to user with defaults', async () => {
      const user = await seedUser()

      const result = await StickyNoteRepository.create({
        userId: user.id,
      })

      const sticky = expectOk(result)
      expect(sticky.userId).toBe(user.id)
      expect(sticky.color).toBe('ZINC')
      expect(sticky.content).toEqual({ type: 'doc', content: [] })
    })

    it('should respect provided color and content', async () => {
      const user = await seedUser()
      const content = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
        ],
      }

      const result = await StickyNoteRepository.create({
        userId: user.id,
        color: 'GREEN',
        content,
      })

      const sticky = expectOk(result)
      expect(sticky.color).toBe('GREEN')
      expect(sticky.content).toEqual(content)
    })

    it('should return DATABASE_ERROR when userId does not exist', async () => {
      const result = await StickyNoteRepository.create({
        userId: 'nonexistent-user',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update color', async () => {
      const user = await seedUser()
      const seeded = await seedStickyNote(user.id, { color: 'ZINC' })

      const result = await StickyNoteRepository.update(seeded.id, {
        color: 'PURPLE',
      })

      const sticky = expectOk(result)
      expect(sticky.color).toBe('PURPLE')
    })

    it('should update content', async () => {
      const user = await seedUser()
      const seeded = await seedStickyNote(user.id)
      const newContent = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'oi' }] },
        ],
      }

      const result = await StickyNoteRepository.update(seeded.id, {
        content: newContent,
      })

      const sticky = expectOk(result)
      expect(sticky.content).toEqual(newContent)
    })

    it('should return DATABASE_ERROR when sticky does not exist', async () => {
      const result = await StickyNoteRepository.update('nonexistent-user', {
        color: 'RED',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should remove sticky', async () => {
      const user = await seedUser()
      const seeded = await seedStickyNote(user.id)

      const result = await StickyNoteRepository.delete(seeded.id)

      expectOk(result)
      const sticky = await prisma.stickyNote.findUnique({
        where: { id: seeded.id },
      })
      expect(sticky).toBeNull()
    })

    it('should return DATABASE_ERROR when sticky does not exist', async () => {
      const result = await StickyNoteRepository.delete('nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
