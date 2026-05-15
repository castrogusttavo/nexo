import { describe, expect, it } from 'vitest'
import { seedShortLink } from '@/src/__tests__/factories/short-link.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ShortLinkRepository } from '../short-link.repository'

describe('ShortLinkRepository', () => {
  describe('findById()', () => {
    it('should return short link when it exists', async () => {
      const user = await seedUser()
      const seeded = await seedShortLink(user.id, {
        title: 'My Link',
      })

      const result = await ShortLinkRepository.findById(seeded.id)

      const link = expectOk(result)
      expect(link.id).toBe(seeded.id)
      expect(link.title).toBe('My Link')
    })

    it('should return RESOURCE_NOT_FOUND when short link does not exists', async () => {
      const result = await ShortLinkRepository.findById('nonexistent')

      expectErr(result, 'RESOURCE_NOT_FOUND')
    })
  })

  describe('listByUserId()', () => {
    it('should return all short links of a user ordered by createdAt desc', async () => {
      const user = await seedUser()
      const older = await seedShortLink(user.id, { title: 'Older' })
      await new Promise((r) => setTimeout(r, 5))
      const newer = await seedShortLink(user.id, { title: 'Newer' })

      const result = await ShortLinkRepository.listByUserId(user.id)

      const list = expectOk(result)
      expect(list.map((l) => l.id)).toEqual([newer.id, older.id])
    })

    it('should not return links of other users', async () => {
      const [a, b] = await Promise.all([seedUser(), seedUser()])
      await seedShortLink(a.id, { title: 'A' })
      await seedShortLink(b.id, { title: 'B' })

      const result = await ShortLinkRepository.listByUserId(a.id)

      const list = expectOk(result)
      expect(list).toHaveLength(1)
      expect(list[0].title).toBe('A')
    })

    it('should return empty array when user has no links', async () => {
      const user = await seedUser()

      const result = await ShortLinkRepository.listByUserId(user.id)

      const list = expectOk(result)
      expect(list).toEqual([])
    })
  })

  describe('create()', () => {
    it('should persist short link bound to user', async () => {
      const user = await seedUser()

      const result = await ShortLinkRepository.create({
        title: 'Docs',
        url: 'https://docs.example.com',
        userId: user.id,
      })

      const link = expectOk(result)
      expect(link.title).toBe('Docs')
      expect(link.userId).toBe(user.id)
    })

    it('should return DATABASE_ERROR when userId does not exist', async () => {
      const result = await ShortLinkRepository.create({
        title: 'Orphan',
        url: 'https://example.com',
        userId: 'nonexistent-user',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update title', async () => {
      const user = await seedUser()
      const seeded = await seedShortLink(user.id, { title: 'Old' })

      const result = await ShortLinkRepository.update(seeded.id, {
        title: 'New',
      })

      const link = expectOk(result)
      expect(link.title).toBe('New')
    })

    it('should update url', async () => {
      const user = await seedUser()
      const seeded = await seedShortLink(user.id)

      const result = await ShortLinkRepository.update(seeded.id, {
        url: 'https://updated.example.com',
      })

      const link = expectOk(result)
      expect(link.url).toBe('https://updated.example.com')
    })

    it('should return DATABASE_ERROR when short link does not exist', async () => {
      const result = await ShortLinkRepository.update('nonexistent', {
        title: 'X',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('delete()', () => {
    it('should remove short link', async () => {
      const user = await seedUser()
      const seeded = await seedShortLink(user.id)

      const result = await ShortLinkRepository.delete(seeded.id)

      expectOk(result)
      const link = await prisma.shortLink.findUnique({
        where: { id: seeded.id },
      })
      expect(link).toBeNull()
    })

    it('should return DATABASE_ERROR when short link does not exist', async () => {
      const result = await ShortLinkRepository.delete('nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
