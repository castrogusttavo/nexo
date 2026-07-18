import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { MemberService } from '@/src/services/member.service'

vi.mock('@/src/repositories/membership.repository')

const mockedMembership = vi.mocked(MembershipRepository)

function membershipWithUser(
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
  name: string,
  joinedAt: Date,
) {
  const membership = createFakeMembership({ role, createdAt: joinedAt })
  const user = createFakeUser({ name, emailVerified: true })
  return { ...membership, user: { ...user, accounts: [] } }
}

const actorMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})

beforeEach(() => {
  vi.clearAllMocks()
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(actorMembership))
})

describe('MemberService.list()', () => {
  it('returns FORBIDDEN when actor is not privileged', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(
        createFakeMembership({
          userId: 'actor',
          workspaceId: 'ws1',
          role: 'MEMBER',
        }),
      ),
    )

    const result = await MemberService.list('actor', 'ws1', {
      sortBy: 'joinedAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
    })

    expectErr(result, 'FORBIDDEN')
    expect(mockedMembership.listByWorkspaceWithUser).not.toHaveBeenCalled()
  })

  it('sorts by role hierarchy (guest to admin) ascending', async () => {
    mockedMembership.listByWorkspaceWithUser.mockResolvedValue(
      ok([
        membershipWithUser('OWNER', 'Owner', new Date('2026-01-01')),
        membershipWithUser('VIEWER', 'Viewer', new Date('2026-01-02')),
        membershipWithUser('ADMIN', 'Admin', new Date('2026-01-03')),
      ]),
    )

    const result = await MemberService.list('actor', 'ws1', {
      sortBy: 'role',
      sortOrder: 'asc',
      page: 1,
      pageSize: 20,
    })

    const { members } = expectOk(result)
    expect(members.map((m) => m.role)).toEqual(['VIEWER', 'ADMIN', 'OWNER'])
  })

  it('sorts by joinedAt descending (new to old) by default', async () => {
    mockedMembership.listByWorkspaceWithUser.mockResolvedValue(
      ok([
        membershipWithUser('MEMBER', 'First', new Date('2026-01-01')),
        membershipWithUser('MEMBER', 'Last', new Date('2026-03-01')),
      ]),
    )

    const result = await MemberService.list('actor', 'ws1', {
      sortBy: 'joinedAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
    })

    const { members } = expectOk(result)
    expect(members.map((m) => m.name)).toEqual(['Last', 'First'])
  })

  it('paginates the sorted result', async () => {
    mockedMembership.listByWorkspaceWithUser.mockResolvedValue(
      ok([
        membershipWithUser('MEMBER', 'A', new Date('2026-01-01')),
        membershipWithUser('MEMBER', 'B', new Date('2026-02-01')),
        membershipWithUser('MEMBER', 'C', new Date('2026-03-01')),
      ]),
    )

    const result = await MemberService.list('actor', 'ws1', {
      sortBy: 'name',
      sortOrder: 'asc',
      page: 2,
      pageSize: 2,
    })

    const page = expectOk(result)
    expect(page.total).toBe(3)
    expect(page.members).toHaveLength(1)
    expect(page.members[0].name).toBe('C')
  })
})
