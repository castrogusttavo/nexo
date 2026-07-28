import { describe, expect, it, vi } from 'vitest'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { databaseError, forbidden } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { assertMember } from '../_authz'
import { resolveProject } from '../_project-scope'

vi.mock('../_authz')
vi.mock('@/src/repositories/project.repository')

const mockedAssertMember = vi.mocked(assertMember)
const mockedProject = vi.mocked(ProjectRepository)

const membership = { role: 'MEMBER' as const, isPrivileged: false }

describe('resolveProject()', () => {
  it('resolves the membership and project when both succeed', async () => {
    mockedAssertMember.mockResolvedValue(ok(membership))
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok({
        ...createFakeProject({ id: 'proj-1' }),
        members: [],
        favourites: [],
      }),
    )

    const result = await resolveProject('actor', 'ws1', 'proj-slug')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project.id).toBe('proj-1')
      expect(result.membership).toEqual(membership)
    }
  })

  it('returns the membership error when the actor is not a member', async () => {
    mockedAssertMember.mockResolvedValue(err(forbidden()))

    const result = await resolveProject('actor', 'ws1', 'proj-slug')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN')
    expect(mockedProject.findByWorkspaceAndSlug).toHaveBeenCalled()
  })

  it('returns the project error when the project cannot be resolved', async () => {
    mockedAssertMember.mockResolvedValue(ok(membership))
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(err(databaseError()))

    const result = await resolveProject('actor', 'ws1', 'proj-slug')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('DATABASE_ERROR')
  })
})
