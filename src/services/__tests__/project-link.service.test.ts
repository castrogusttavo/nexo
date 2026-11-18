import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { projectLinkNotFound } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectLinkRepository } from '@/src/repositories/project-link.repository'
import { ProjectLinkService } from '../project-link.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-link.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

const membership = vi.mocked(MembershipRepository)
const projects = vi.mocked(ProjectRepository)
const links = vi.mocked(ProjectLinkRepository)

const link = {
  id: 'l1',
  projectId: 'p1',
  title: null,
  url: 'https://a.com',
  createdById: 'actor',
  createdAt: new Date(),
  updatedAt: new Date(),
}

function asRole(role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') {
  membership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

function project(overrides: Record<string, unknown> = {}) {
  return ok({
    id: 'p1',
    workspaceId: 'ws1',
    leadId: 'lead',
    isPublic: false,
    members: [{ userId: 'actor' }],
    favourites: [],
    labelAssignments: [],
    ...overrides,
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  asRole('MEMBER')
  projects.findByWorkspaceAndSlug.mockResolvedValue(project())
})

describe('ProjectLinkService', () => {
  describe('list()', () => {
    it('should list for a project member', async () => {
      links.listByProject.mockResolvedValue(ok([link]))

      const result = await ProjectLinkService.list('actor', 'ws1', 'slug')

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should refuse a stranger on a private project', async () => {
      projects.findByWorkspaceAndSlug.mockResolvedValue(
        project({ members: [] }),
      )

      const result = await ProjectLinkService.list('actor', 'ws1', 'slug')

      expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should create for ADMIN', async () => {
      asRole('ADMIN')
      links.countByProject.mockResolvedValue(ok(0))
      links.create.mockResolvedValue(ok(link))

      const result = await ProjectLinkService.create('actor', 'ws1', 'slug', {
        url: 'https://a.com',
      })

      expect(expectOk(result).url).toBe('https://a.com')
      expect(links.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          title: null,
          createdById: 'actor',
        }),
      )
    })

    it('should create for the lead', async () => {
      projects.findByWorkspaceAndSlug.mockResolvedValue(
        project({ leadId: 'actor' }),
      )
      links.countByProject.mockResolvedValue(ok(0))
      links.create.mockResolvedValue(ok(link))

      expectOk(
        await ProjectLinkService.create('actor', 'ws1', 'slug', {
          url: 'https://a.com',
        }),
      )
    })

    it('should refuse a plain member without touching the repository', async () => {
      const result = await ProjectLinkService.create('actor', 'ws1', 'slug', {
        url: 'https://a.com',
      })

      expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
      expect(links.create).not.toHaveBeenCalled()
    })

    it('should return PROJECT_LINK_LIMIT_REACHED at 20 links', async () => {
      asRole('OWNER')
      links.countByProject.mockResolvedValue(ok(20))

      const result = await ProjectLinkService.create('actor', 'ws1', 'slug', {
        url: 'https://a.com',
      })

      expect(expectErr(result).code).toBe('PROJECT_LINK_LIMIT_REACHED')
      expect(links.create).not.toHaveBeenCalled()
    })
  })

  describe('update() / remove()', () => {
    it('should not touch a link of another project', async () => {
      asRole('OWNER')
      links.findById.mockResolvedValue(ok({ ...link, projectId: 'outro' }))

      const result = await ProjectLinkService.update(
        'actor',
        'ws1',
        'slug',
        'l1',
        { title: 'x' },
      )

      expect(expectErr(result).code).toBe('PROJECT_LINK_NOT_FOUND')
      expect(links.update).not.toHaveBeenCalled()
    })

    it('should update and remove an own-project link', async () => {
      asRole('OWNER')
      links.findById.mockResolvedValue(ok(link))
      links.update.mockResolvedValue(ok({ ...link, title: 'novo' }))
      links.delete.mockResolvedValue(ok(undefined))

      expect(
        expectOk(
          await ProjectLinkService.update('actor', 'ws1', 'slug', 'l1', {
            title: 'novo',
          }),
        ).title,
      ).toBe('novo')
      expectOk(await ProjectLinkService.remove('actor', 'ws1', 'slug', 'l1'))
    })

    it('should propagate PROJECT_LINK_NOT_FOUND', async () => {
      asRole('OWNER')
      links.findById.mockResolvedValue(err(projectLinkNotFound()))

      const result = await ProjectLinkService.remove(
        'actor',
        'ws1',
        'slug',
        'x',
      )

      expect(expectErr(result).code).toBe('PROJECT_LINK_NOT_FOUND')
    })
  })
})
