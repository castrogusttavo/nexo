import { afterAll, describe, expect, it, vi } from 'vitest'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { WikiPageRepository } from '../wiki-page.repository'

afterAll(() => {
  vi.restoreAllMocks()
})

describe('WikiPageRepository', () => {
  describe('findById()', () => {
    it('should return the wiki page when it exists', async () => {
      const workspace = await seedWorkspace()
      const user = await seedUser()
      const seeded = await seedWikiPage(workspace.id, user.id, {
        title: 'Onboarding',
      })

      const result = await WikiPageRepository.findById(seeded.id)

      const page = expectOk(result)
      expect(page.title).toBe('Onboarding')
    })

    it('should return WIKI_PAGE_NOT_FOUND when it does not exist', async () => {
      const result = await WikiPageRepository.findById('nonexistent')
      expectErr(result, 'WIKI_PAGE_NOT_FOUND')
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.wikiPage, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await WikiPageRepository.findById('x'), 'DATABASE_ERROR')
    })
  })

  describe('listByWorkspace()', () => {
    it('should list only non-archived pages of the workspace, ordered by position', async () => {
      const workspace = await seedWorkspace()
      const user = await seedUser()
      await seedWikiPage(workspace.id, user.id, {
        title: 'B',
        position: 1,
      })
      await seedWikiPage(workspace.id, user.id, {
        title: 'A',
        position: 0,
      })

      const archived = await seedWikiPage(workspace.id, user.id, {
        title: 'Arquivada',
      })
      await prisma.wikiPage.update({
        where: { id: archived.id },
        data: { archivedAt: new Date() },
      })

      const result = await WikiPageRepository.listByWorkspace(workspace.id)

      const pages = expectOk(result)
      expect(pages.map((p) => p.title)).toEqual(['A', 'B'])
    })
  })

  describe('create()', () => {
    it('should create a root page with position based on sibling count', async () => {
      const workspace = await seedWorkspace()
      const user = await seedUser()
      await seedWikiPage(workspace.id, user.id, { position: 0 })

      const result = await WikiPageRepository.create({
        workspaceId: workspace.id,
        parentId: null,
        title: 'Nova página',
        createdById: user.id,
      })

      const page = expectOk(result)
      expect(page.position).toBe(1)
      expect(page.content).toEqual([{ type: 'p', children: [{ text: '' }] }])
    })
  })

  describe('archive()', () => {
    it('should set archivedAt and updatedById', async () => {
      const workspace = await seedWorkspace()
      const user = await seedUser()
      const seeded = await seedWikiPage(workspace.id, user.id)

      const result = await WikiPageRepository.archive(seeded.id, user.id)

      const page = expectOk(result)
      expect(page.archivedAt).not.toBeNull()
      expect(page.updatedById).toBe(user.id)
    })
  })
})
