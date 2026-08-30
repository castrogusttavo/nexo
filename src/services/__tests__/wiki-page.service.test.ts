import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WikiPageRepository } from '@/src/repositories/wiki-page.repository'
import { WikiPageService } from '../wiki-page.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/wiki-page.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedWikiPage = vi.mocked(WikiPageRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

describe('WikiPageService', () => {
  describe('getById()', () => {
    it('should return the page for a workspace member', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )

      mockedWikiPage.findById.mockResolvedValue(ok(page))

      const result = await WikiPageService.getById('actor', 'ws1', 'w1')

      expectOk(result)
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiPageService.getById('stranger', 'ws1', 'w1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedWikiPage.findById).not.toHaveBeenCalled()
    })

    it('should return WIKI_PAGE_FORBIDDEN when page belongs to another workspace', async () => {})
  })

  describe('create()', () => {
    it('should create a root page for a workspace member', async () => {
      const created = createFakeWikiPage({ workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedWikiPage.create.mockResolvedValue(ok(created))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
      })

      const dto = expectOk(result)
      expect(dto.workspaceId).toBe('ws1')
      expect(mockedWikiPage.create).toHaveBeenCalledWith({
        workspaceId: 'ws1',
        parentId: null,
        title: '',
        icon: undefined,
        createdById: 'actor',
      })
    })

    it('should reject a parent from another workspace', async () => {
      const parent = createFakeWikiPage({ id: 'p1', workspaceId: 'ws2' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedWikiPage.findById.mockResolvedValue(ok(parent))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
        parentId: 'p1',
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )

      mockedWikiPage.create.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('move()', () => {
    it('should reject moving a page under itself', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedWikiPage.create.mockResolvedValue(ok(page))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: 'w1',
        position: 0,
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.move).not.toHaveBeenCalled()
    })
  })

  describe('archive()', () => {
    it('should archive when actor is a workspace member', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      const archived = createFakeWikiPage({
        id: 'w1',
        workspaceId: 'ws1',
        archivedAt: new Date(),
      })
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        ok(memberMembership),
      )
      mockedWikiPage.findById.mockResolvedValue(ok(page))
      mockedWikiPage.archive.mockResolvedValue(ok(archived))

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      const dto = expectOk(result)
      expect(dto.archivedAt).not.toBeNull()
    })
  })
})
