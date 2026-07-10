import type { ShortLink } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { notFound } from '../errors/app-error'
import { dbError } from './db-error'

export const ShortLinkRepository = {
  async findById(id: string): Promise<Result<ShortLink>> {
    try {
      const shortLink = await prisma.shortLink.findUnique({ where: { id } })

      if (!shortLink) {
        return err(notFound('ShortLink'))
      }

      return ok(shortLink)
    } catch (error) {
      return err(dbError('Failed to find short link by id', error))
    }
  },

  async listByUserId(userId: string): Promise<Result<ShortLink[]>> {
    try {
      const shortLinks = await prisma.shortLink.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      return ok(shortLinks)
    } catch (error) {
      return err(dbError('Failed to list short links', error))
    }
  },

  async create(data: {
    title: string
    url: string
    userId: string
  }): Promise<Result<ShortLink>> {
    try {
      const shortLink = await prisma.shortLink.create({ data })

      return ok(shortLink)
    } catch (error) {
      return err(dbError('Failed to create short link', error))
    }
  },

  async update(
    id: string,
    data: { title?: string; url?: string },
  ): Promise<Result<ShortLink>> {
    try {
      const shortLink = await prisma.shortLink.update({ where: { id }, data })

      return ok(shortLink)
    } catch (error) {
      return err(dbError('Failed to update short link', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.shortLink.delete({ where: { id } })

      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete short link', error))
    }
  },
}
