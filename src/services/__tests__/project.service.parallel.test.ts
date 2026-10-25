import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectService } from '../project.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)

const membership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})
const project = {
  ...createFakeProject({ isPublic: true, workspaceId: 'ws1', leadId: 'x' }),
  members: [],
  favourites: [] as [],
}

// A membership lookup that stays pending until released: whatever the service
// starts before that point is running beside it, not after it.
function pendingMembership() {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  mockedMembership.findByUserAndWorkspace.mockImplementation(async () => {
    await gate
    return ok(membership)
  })
  return release
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('ProjectService reads run the membership and project lookups together', () => {
  it('getBySlug() looks the project up while the membership is pending', async () => {
    const release = pendingMembership()
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(project))

    const pending = ProjectService.getBySlug('actor', 'ws1', project.slug)
    await vi.waitFor(() =>
      expect(mockedProject.findByWorkspaceAndSlug).toHaveBeenCalled(),
    )
    release()

    expect((await pending).ok).toBe(true)
  })

  it('listMembers() looks the project up while the membership is pending', async () => {
    const release = pendingMembership()
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(ok(project))
    mockedProject.listMembers.mockResolvedValue(ok([]))

    const pending = ProjectService.listMembers('actor', 'ws1', project.slug)
    await vi.waitFor(() =>
      expect(mockedProject.findByWorkspaceAndSlug).toHaveBeenCalled(),
    )
    release()

    expect((await pending).ok).toBe(true)
  })

  it('reports the membership error first when both lookups fail', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null) as never)
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue({
      ok: false,
      error: databaseError('boom'),
    })

    const result = await ProjectService.getBySlug('actor', 'ws1', 'p')

    expect(expectErr(result)?.code).toBe('FORBIDDEN')
  })
})
