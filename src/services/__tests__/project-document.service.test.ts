import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, forbidden, projectNotFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectDocumentRepository } from '@/src/repositories/project-document.repository'
import { ProjectDocumentService } from '../project-document.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-document.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedDoc = vi.mocked(ProjectDocumentRepository)

const content = [{ type: 'p', children: [{ text: 'oi' }] }]

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    workspaceId: 'ws1',
    leadId: 'lead',
    isPublic: false,
    members: [] as { userId: string }[],
    favourites: [],
    labelAssignments: [],
    document: content,
    documentUpdatedAt: null,
    ...overrides,
  } as never
}

function asRole(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  asRole('MEMBER')
  mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(project()))
})

describe('ProjectDocumentService', () => {
  describe('get()', () => {
    it('should return the snapshot to a project member', async () => {
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(project({ members: [{ userId: 'actor' }] })),
      )

      const result = await ProjectDocumentService.get('actor', 'ws1', 'slug')

      expect(expectOk(result).content).toEqual(content)
    })

    it('should allow any workspace member on a public project', async () => {
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(project({ isPublic: true })),
      )

      expectOk(await ProjectDocumentService.get('actor', 'ws1', 'slug'))
    })

    it('should return PROJECT_FORBIDDEN to a non-member of a private project', async () => {
      const result = await ProjectDocumentService.get('actor', 'ws1', 'slug')

      expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    })

    it('should return FORBIDDEN when the actor is outside the workspace', async () => {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(forbidden()),
      )

      const result = await ProjectDocumentService.get('actor', 'ws1', 'slug')

      expect(expectErr(result).code).toBe('FORBIDDEN')
    })

    it('should return PROJECT_NOT_FOUND for an unknown slug', async () => {
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        err(projectNotFound()),
      )

      const result = await ProjectDocumentService.get('actor', 'ws1', 'x')

      expect(expectErr(result).code).toBe('PROJECT_NOT_FOUND')
    })
  })

  describe('update()', () => {
    it('should save when the actor is ADMIN', async () => {
      asRole('ADMIN')
      mockedDoc.updateContent.mockResolvedValue(
        ok({ document: content, documentUpdatedAt: new Date() } as never),
      )

      const result = await ProjectDocumentService.update(
        'actor',
        'ws1',
        'slug',
        { content },
      )

      expect(expectOk(result).content).toEqual(content)
      expect(mockedDoc.updateContent).toHaveBeenCalledWith('p1', content)
    })

    it('should save when the actor is the project lead', async () => {
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(project({ leadId: 'actor' })),
      )
      mockedDoc.updateContent.mockResolvedValue(
        ok({ document: content, documentUpdatedAt: new Date() } as never),
      )

      expectOk(
        await ProjectDocumentService.update('actor', 'ws1', 'slug', {
          content,
        }),
      )
    })

    it('should refuse a plain member and never touch the repository', async () => {
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(project({ members: [{ userId: 'actor' }] })),
      )

      const result = await ProjectDocumentService.update(
        'actor',
        'ws1',
        'slug',
        { content },
      )

      expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
      expect(mockedDoc.updateContent).not.toHaveBeenCalled()
    })

    it('should propagate a repository failure', async () => {
      asRole('OWNER')
      mockedDoc.updateContent.mockResolvedValue(err(databaseError('boom')))

      const result = await ProjectDocumentService.update(
        'actor',
        'ws1',
        'slug',
        { content },
      )

      expect(expectErr(result).code).toBe('DATABASE_ERROR')
    })
  })

  describe('authorizeRealtime()', () => {
    const access = (overrides: Record<string, unknown> = {}) =>
      ok({
        id: 'p1',
        workspaceId: 'ws1',
        leadId: 'lead',
        isPublic: false,
        members: [],
        documentYjsState: null,
        ...overrides,
      } as never)

    it('should grant write to a privileged role', async () => {
      asRole('OWNER')
      mockedDoc.findAccessById.mockResolvedValue(access())

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'p1',
      )

      expect(expectOk(result).canWrite).toBe(true)
    })

    it('should grant write to the project lead', async () => {
      mockedDoc.findAccessById.mockResolvedValue(access({ leadId: 'actor' }))

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'p1',
      )

      expect(expectOk(result).canWrite).toBe(true)
    })

    it('should grant read-only to a project member', async () => {
      mockedDoc.findAccessById.mockResolvedValue(
        access({ members: [{ userId: 'actor' }] }),
      )

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'p1',
      )

      expect(expectOk(result).canWrite).toBe(false)
    })

    it('should refuse a stranger on a private project', async () => {
      mockedDoc.findAccessById.mockResolvedValue(access())

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'p1',
      )

      expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    })

    it('should refuse an actor outside the workspace', async () => {
      mockedDoc.findAccessById.mockResolvedValue(access())
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(
        err(forbidden()),
      )

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'p1',
      )

      expect(expectErr(result).code).toBe('FORBIDDEN')
    })

    it('should return PROJECT_NOT_FOUND for an unknown project', async () => {
      mockedDoc.findAccessById.mockResolvedValue(err(projectNotFound()))

      const result = await ProjectDocumentService.authorizeRealtime(
        'actor',
        'nope',
      )

      expect(expectErr(result).code).toBe('PROJECT_NOT_FOUND')
    })
  })
})
