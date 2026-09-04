import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, forbidden } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WikiPageRepository } from '@/src/repositories/wiki-page.repository'
import { WikiPageService } from '../wiki-page.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/wiki-page.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

const mockedMembership = vi.mocked(MembershipRepository)
const mockedWikiPage = vi.mocked(WikiPageRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})

beforeEach(() => {
  vi.clearAllMocks()
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(memberMembership),
  )
})

describe('WikiPageService', () => {
  describe('list()', () => {
    it('should return the workspace pages as DTOs', async () => {
      mockedWikiPage.listByWorkspace.mockResolvedValue(
        ok([createFakeWikiPage({ workspaceId: 'ws1' })]),
      )

      const result = await WikiPageService.list('actor', 'ws1')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(forbidden()),
      )

      const result = await WikiPageService.list('actor', 'ws1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedWikiPage.listByWorkspace).not.toHaveBeenCalled()
    })

    it('should propagate the repository error', async () => {
      mockedWikiPage.listByWorkspace.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.list('actor', 'ws1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('getById()', () => {
    it('should return the page for a workspace member', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
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

    it('should propagate the repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.getById('actor', 'ws1', 'w1')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return WIKI_PAGE_FORBIDDEN when the page belongs to another workspace', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'other-ws' })),
      )

      const result = await WikiPageService.getById('actor', 'ws1', 'w1')

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create a root page for a workspace member', async () => {
      const created = createFakeWikiPage({ workspaceId: 'ws1' })
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
      mockedWikiPage.findById.mockResolvedValue(ok(parent))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
        parentId: 'p1',
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.create).not.toHaveBeenCalled()
    })

    it('should propagate the parent lookup repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
        parentId: 'p1',
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedWikiPage.create).not.toHaveBeenCalled()
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
      })

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate repo error', async () => {
      mockedWikiPage.create.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.create('actor', 'ws1', {
        title: '',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update metadata fields and audit the mutation', async () => {
      const existing = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      const updated = createFakeWikiPage({
        id: 'w1',
        workspaceId: 'ws1',
        title: 'Novo título',
      })
      mockedWikiPage.findById.mockResolvedValue(ok(existing))
      mockedWikiPage.update.mockResolvedValue(ok(updated))

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        title: 'Novo título',
      })

      expect(expectOk(result).title).toBe('Novo título')
    })

    it('should update content-only autosaves without throwing', async () => {
      const existing = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      mockedWikiPage.findById.mockResolvedValue(ok(existing))
      mockedWikiPage.update.mockResolvedValue(ok(existing))

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        content: [{ type: 'p', children: [{ text: 'x' }] }] as never,
      })

      expectOk(result)
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        title: 'x',
      })

      expectErr(result, 'FORBIDDEN')
      expect(mockedWikiPage.findById).not.toHaveBeenCalled()
    })

    it('should propagate the findById repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        title: 'x',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return WIKI_PAGE_FORBIDDEN when the page belongs to another workspace', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'other-ws' })),
      )

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        title: 'x',
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.update).not.toHaveBeenCalled()
    })

    it('should propagate the update repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })),
      )
      mockedWikiPage.update.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.update('actor', 'ws1', 'w1', {
        title: 'x',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('move()', () => {
    it('should move the page to a valid parent in the same workspace', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      const parent = createFakeWikiPage({ id: 'p1', workspaceId: 'ws1' })
      const moved = createFakeWikiPage({
        id: 'w1',
        workspaceId: 'ws1',
        parentId: 'p1',
      })
      mockedWikiPage.findById.mockImplementation(async (id: string) =>
        id === 'w1' ? ok(page) : ok(parent),
      )
      mockedWikiPage.move.mockResolvedValue(ok(moved))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: 'p1',
        position: 1,
      })

      expect(expectOk(result).parentId).toBe('p1')
    })

    it('should reject moving a page under itself', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      mockedWikiPage.findById.mockResolvedValue(ok(page))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: 'w1',
        position: 0,
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.move).not.toHaveBeenCalled()
    })

    it('should reject a new parent from another workspace', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      const parent = createFakeWikiPage({ id: 'p1', workspaceId: 'ws2' })
      mockedWikiPage.findById.mockImplementation(async (id: string) =>
        id === 'w1' ? ok(page) : ok(parent),
      )

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: 'p1',
        position: 0,
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.move).not.toHaveBeenCalled()
    })

    it('should propagate the parent lookup repository error', async () => {
      const page = createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })
      mockedWikiPage.findById.mockImplementation(async (id: string) =>
        id === 'w1' ? ok(page) : err(databaseError()),
      )

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: 'p1',
        position: 0,
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: null,
        position: 0,
      })

      expectErr(result, 'FORBIDDEN')
    })

    it('should propagate the findById repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: null,
        position: 0,
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return WIKI_PAGE_FORBIDDEN when the page belongs to another workspace', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'other-ws' })),
      )

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: null,
        position: 0,
      })

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
    })

    it('should propagate the move repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })),
      )
      mockedWikiPage.move.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.move('actor', 'ws1', 'w1', {
        parentId: null,
        position: 0,
      })

      expectErr(result, 'DATABASE_ERROR')
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
      mockedWikiPage.findById.mockResolvedValue(ok(page))
      mockedWikiPage.archive.mockResolvedValue(ok(archived))

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      const dto = expectOk(result)
      expect(dto.archivedAt).not.toBeNull()
    })

    it('should return FORBIDDEN when actor is not a workspace member', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      expectErr(result, 'FORBIDDEN')
      expect(mockedWikiPage.findById).not.toHaveBeenCalled()
    })

    it('should propagate the findById repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      expectErr(result, 'DATABASE_ERROR')
    })

    it('should return WIKI_PAGE_FORBIDDEN when the page belongs to another workspace', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'other-ws' })),
      )

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      expectErr(result, 'WIKI_PAGE_FORBIDDEN')
      expect(mockedWikiPage.archive).not.toHaveBeenCalled()
    })

    it('should propagate the archive repository error', async () => {
      mockedWikiPage.findById.mockResolvedValue(
        ok(createFakeWikiPage({ id: 'w1', workspaceId: 'ws1' })),
      )
      mockedWikiPage.archive.mockResolvedValue(err(databaseError()))

      const result = await WikiPageService.archive('actor', 'ws1', 'w1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
