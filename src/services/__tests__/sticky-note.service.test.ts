import { describe, expect, it, vi } from 'vitest'
import { createFakeStickyNote } from '@/src/__tests__/factories/sticky-note.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { StickyNoteRepository } from '@/src/repositories/sticky-note.repository'
import { StickyNoteService } from '../sticky-note.service'

vi.mock('@/src/repositories/sticky-note.repository')

const mockedRepo = vi.mocked(StickyNoteRepository)

describe('StickyNoteService', () => {
  describe('list()', () => {
    it('should return user stickies as DTOs', async () => {
      const stickies = [
        createFakeStickyNote({ id: 's1', userId: 'u1' }),
        createFakeStickyNote({ id: 's2', userId: 'u1' }),
      ]
      mockedRepo.listByUserId.mockResolvedValue(ok(stickies))

      const result = await StickyNoteService.list('u1')

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(2)
      expect(dtos[0].id).toBe('s1')

      expect(mockedRepo.listByUserId).toHaveBeenCalledWith('u1')
    })
  })

  describe('getById()', () => {
    it('should return sticky when actor is owner', async () => {
      const sticky = createFakeStickyNote({ id: 's1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(sticky))

      const result = await StickyNoteService.getById('u1', 's1')

      const dto = expectOk(result)
      expect(dto.id).toBe('s1')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const sticky = createFakeStickyNote({ id: 's1', userId: 'owner' })
      mockedRepo.findById.mockResolvedValue(ok(sticky))

      const result = await StickyNoteService.getById('stranger', 's1')

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate not found from repo', async () => {
      mockedRepo.findById.mockResolvedValue(
        err({ code: 'RESOURCE_NOT_FOUND', message: 'not found', status: 404 }),
      )

      const result = await StickyNoteService.getById('u1', 's1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('create()', () => {
    it('should create sticky with actor as owner using defaults', async () => {
      const created = createFakeStickyNote({ userId: 'u1' })
      mockedRepo.create.mockResolvedValue(ok(created))

      const result = await StickyNoteService.create('u1', {})

      const dto = expectOk(result)
      expect(dto.userId).toBe('u1')
      expect(mockedRepo.create).toHaveBeenLastCalledWith({
        userId: 'u1',
        content: undefined,
        color: undefined,
      })
    })

    it('should forward color and content to repo', async () => {
      const content = { type: 'doc', content: [{ type: 'paragraph' }] }
      const created = createFakeStickyNote({
        userId: 'u1',
        color: 'BLUE',
        content,
      })
      mockedRepo.create.mockResolvedValue(ok(created))

      await StickyNoteService.create('u1', { color: 'BLUE', content })

      expect(mockedRepo.create).toHaveBeenLastCalledWith({
        userId: 'u1',
        color: 'BLUE',
        content,
      })
    })

    it('should propagate repo error', async () => {
      mockedRepo.create.mockResolvedValue(err(databaseError()))

      const result = await StickyNoteService.create('u1', {})

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update when actor is owner', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'u1' })
      const updated = createFakeStickyNote({
        id: 's1',
        userId: 'u1',
        color: 'RED',
      })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.update.mockResolvedValue(ok(updated))

      const result = await StickyNoteService.update('u1', 's1', {
        color: 'RED',
      })

      const dto = expectOk(result)
      expect(dto.color).toEqual('RED')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))

      const result = await StickyNoteService.update('stranger', 's1', {
        color: 'RED',
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))

      mockedRepo.update.mockResolvedValue(err(databaseError()))

      const result = await StickyNoteService.update('u1', 's1', {
        color: 'RED',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should delete when actor is owner', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.delete.mockResolvedValue(ok(undefined))

      const result = await StickyNoteService.delete('u1', 's1')

      expectOk(result)
      expect(mockedRepo.delete).toHaveBeenCalledWith('s1')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'owner' })
      mockedRepo.findById.mockResolvedValue(ok(existing))

      const result = await StickyNoteService.delete('stranger', 's1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedRepo.delete).not.toHaveBeenCalled()
    })

    it('should propagate delete error', async () => {
      const existing = createFakeStickyNote({ id: 's1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.delete.mockResolvedValue(err(databaseError()))

      const result = await StickyNoteService.delete('u1', 's1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
