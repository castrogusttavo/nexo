import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectProgressRepository } from '@/src/repositories/project-progress.repository'
import { ProjectProgressService } from '@/src/services/project-progress.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-progress.repository')

const membership = vi.mocked(MembershipRepository)
const projects = vi.mocked(ProjectRepository)
const progress = vi.mocked(ProjectProgressRepository)

function project(members: { userId: string }[]) {
  return ok({
    id: 'p1',
    workspaceId: 'ws1',
    leadId: 'lead',
    isPublic: false,
    members,
    favourites: [],
    labelAssignments: [],
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  membership.findByUserAndWorkspace.mockResolvedValue(
    ok(
      createFakeMembership({
        userId: 'actor',
        workspaceId: 'ws1',
        role: 'MEMBER',
      }),
    ),
  )
})

describe('ProjectProgressService.get', () => {
  it('should return the progress for a project member', async () => {
    projects.findByWorkspaceAndSlug.mockResolvedValue(
      project([{ userId: 'actor' }]),
    )
    progress.countByStateGroup.mockResolvedValue(
      ok([
        { group: 'BACKLOG', count: 3 },
        { group: 'STARTED', count: 4 },
      ] as never),
    )

    const result = expectOk(
      await ProjectProgressService.get('actor', 'ws1', 'slug'),
    )

    expect(result.total).toBe(7)
    expect(result.groups[0].percentage).toBe(43)
    expect(progress.countByStateGroup).toHaveBeenCalledWith('p1')
  })

  it('should refuse a stranger on a private project', async () => {
    projects.findByWorkspaceAndSlug.mockResolvedValue(project([]))

    const result = await ProjectProgressService.get('actor', 'ws1', 'slug')

    expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    expect(progress.countByStateGroup).not.toHaveBeenCalled()
  })
})
