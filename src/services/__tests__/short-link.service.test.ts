import { describe, expect, it, vi } from 'vitest'
import { createFakeShortLink } from '@/src/__tests__/factories/short-link.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { ShortLinkService } from '@/src/services/short-link.service'

vi.mock('@/src/repositories/short-link.repository')

import { ShortLinkRepository } from '@/src/repositories/short-link.repository'

const mockedRepo = vi.mocked(ShortLinkRepository)

describe('ShortLinkService', () => {
  describe('list()', () => {
    it('should return user short links as DTOs', async () => {
      const links = [
        createFakeShortLink({ id: 'sl1', userId: 'u1' }),
        createFakeShortLink({ id: 'sl2', userId: 'u1' }),
      ]
      mockedRepo.listByUserId.mockResolvedValue(ok(links))

      const result = await ShortLinkService.list('u1')

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(2)
      expect(dtos[0].id).toBe('sl1')
      expect(mockedRepo.listByUserId).toHaveBeenCalledWith('u1')
    })

    it('should propagate repo error', async () => {
      mockedRepo.listByUserId.mockResolvedValue(err(databaseError()))

      const result = await ShortLinkService.list('u1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('getById()', () => {
    it('should return short link when actor is owner', async () => {
      const link = createFakeShortLink({ id: 'sl1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(link))

      const result = await ShortLinkService.getById('u1', 'sl1')

      const dto = expectOk(result)
      expect(dto.id).toBe('sl1')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const link = createFakeShortLink({ id: 'sl1', userId: 'owner' })
      mockedRepo.findById.mockResolvedValue(ok(link))

      const result = await ShortLinkService.getById('stranger', 'sl1')

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate not found from repo', async () => {
      mockedRepo.findById.mockResolvedValue(
        err({ code: 'RESOURCE_NOT_FOUND', message: 'not found', status: 404 }),
      )

      const result = await ShortLinkService.getById('u1', 'sl1')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('create()', () => {
    it('should create short link with actor as owner', async () => {
      const created = createFakeShortLink({
        title: 'Docs',
        url: 'https://docs.com',
        userId: 'u1',
      })
      mockedRepo.create.mockResolvedValue(ok(created))

      const result = await ShortLinkService.create('u1', {
        title: 'Docs',
        url: 'https://docs.com',
      })

      const dto = expectOk(result)
      expect(dto.title).toBe('Docs')
      expect(mockedRepo.create).toHaveBeenCalledWith({
        title: 'Docs',
        url: 'https://docs.com',
        userId: 'u1',
      })
    })

    it('should propagate repo error', async () => {
      mockedRepo.create.mockResolvedValue(err(databaseError()))

      const result = await ShortLinkService.create('u1', {
        title: 'X',
        url: 'https://x.com',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update when actor is owner', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'u1' })
      const updated = createFakeShortLink({
        id: 'sl1',
        userId: 'u1',
        title: 'New',
      })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.update.mockResolvedValue(ok(updated))

      const result = await ShortLinkService.update('u1', 'sl1', {
        title: 'New',
      })

      const dto = expectOk(result)
      expect(dto.title).toBe('New')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'owner' })
      mockedRepo.findById.mockResolvedValue(ok(existing))

      const result = await ShortLinkService.update('stranger', 'sl1', {
        title: 'Hijack',
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate repo update error', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.update.mockResolvedValue(err(databaseError()))

      const result = await ShortLinkService.update('u1', 'sl1', { title: 'X' })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should delete when actor is owner', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.delete.mockResolvedValue(ok(undefined))

      const result = await ShortLinkService.delete('u1', 'sl1')

      expectOk(result)
      expect(mockedRepo.delete).toHaveBeenCalledWith('sl1')
    })

    it('should return FORBIDDEN when actor is not owner', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'owner' })
      mockedRepo.findById.mockResolvedValue(ok(existing))

      const result = await ShortLinkService.delete('stranger', 'sl1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedRepo.delete).not.toHaveBeenCalled()
    })

    it('should propagate delete error', async () => {
      const existing = createFakeShortLink({ id: 'sl1', userId: 'u1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.delete.mockResolvedValue(err(databaseError()))

      const result = await ShortLinkService.delete('u1', 'sl1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
