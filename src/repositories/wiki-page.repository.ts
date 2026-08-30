import type { Prisma, WikiPage } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { wikiPageNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

const EMPTY_CONTENT: Prisma.InputJsonValue = [
  { type: 'p', children: [{ text: '' }] },
]

export const WikiPageRepository = {
  async findById(id: string): Promise<Result<WikiPage>> {
    try {
      const wikiPage = await prisma.wikiPage.findUnique({ where: { id } })
      if (!wikiPage) return err(wikiPageNotFound())
      return ok(wikiPage)
    } catch (error) {
      return err(dbError('Failed to find wiki page by id', error))
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<WikiPage[]>> {
    try {
      const wikiPages = await prisma.wikiPage.findMany({
        where: { workspaceId, archivedAt: null },
        orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
      })
      return ok(wikiPages)
    } catch (error) {
      return err(dbError('Failed to list wiki pages', error))
    }
  },

  async create(data: {
    workspaceId: string
    parentId: string | null
    title: string
    icon?: string
    createdById: string
  }): Promise<Result<WikiPage>> {
    try {
      const siblingCount = await prisma.wikiPage.count({
        where: {
          workspaceId: data.workspaceId,
          parentId: data.parentId,
          archivedAt: null,
        },
      })

      const wiki = await prisma.wikiPage.create({
        data: {
          workspaceId: data.workspaceId,
          parentId: data.parentId,
          title: data.title,
          icon: data.icon,
          content: EMPTY_CONTENT,
          position: siblingCount,
          createdById: data.createdById,
        },
      })

      return ok(wiki)
    } catch (error) {
      return err(dbError('Failed to create wiki page', error))
    }
  },

  async update(
    id: string,
    data: {
      title?: string
      icon?: string | null
      coverImage?: string | null
      content?: Prisma.InputJsonValue
      updatedById: string
    },
  ): Promise<Result<WikiPage>> {
    try {
      const wikiPage = await prisma.wikiPage.update({ where: { id }, data })
      return ok(wikiPage)
    } catch (error) {
      return err(dbError('Failed to update wiki page', error))
    }
  },

  async move(
    id: string,
    data: { parentId: string | null; position: number; updatedById: string },
  ): Promise<Result<WikiPage>> {
    try {
      const wikiPage = await prisma.wikiPage.update({ where: { id }, data })
      return ok(wikiPage)
    } catch (error) {
      return err(dbError('Failed to move wiki page', error))
    }
  },

  async archive(id: string, updatedById: string): Promise<Result<WikiPage>> {
    try {
      const wikiPage = await prisma.wikiPage.update({
        where: { id },
        data: { archivedAt: new Date(), updatedById },
      })
      return ok(wikiPage)
    } catch (error) {
      return err(dbError('Failed to archive wiki page', error))
    }
  },

  async updateYjsState(
    id: string,
    data: { yjsState: Uint8Array; updatedById: string },
  ): Promise<Result<WikiPage>> {
    try {
      const wikiPage = await prisma.wikiPage.update({
        where: { id },
        // `Y.encodeStateAsUpdate()` types its result as
        // `Uint8Array<ArrayBufferLike>`, but Prisma's Bytes field wants
        // `Uint8Array<ArrayBuffer>` — copy into a plain ArrayBuffer-backed
        // array to satisfy it.
        data: { ...data, yjsState: new Uint8Array(data.yjsState) },
      })
      return ok(wikiPage)
    } catch (error) {
      return err(dbError('Failed to persist wiki page yjs state', error))
    }
  },
}
