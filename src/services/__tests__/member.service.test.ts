import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  invitationAlreadyMember,
  invitationDuplicate,
  mailError,
} from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { InvitationService } from '@/src/services/invitation.service'
import { MemberService } from '@/src/services/member.service'
import type { InvitationDTO } from '@/types/invitation'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/workspace.repository')
vi.mock('@/src/services/invitation.service')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

const mockedMembership = vi.mocked(MembershipRepository)
const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedInvitation = vi.mocked(InvitationService)

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

function fakeInvitation(overrides: Partial<InvitationDTO> = {}): InvitationDTO {
  return {
    id: 'inv1',
    email: 'invitee@example.com',
    role: 'MEMBER',
    status: 'PENDING',
    expiresAt: new Date().toISOString(),
    workspaceId: 'ws1',
    projectId: null,
    invitedById: 'actor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('MemberService.import()', () => {
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

    const result = await MemberService.import('actor', 'ws1', [
      { email: 'a@example.com', role: 'MEMBER' },
    ])

    expectErr(result, 'FORBIDDEN')
    expect(mockedWorkspace.findById).not.toHaveBeenCalled()
  })

  it('returns FEATURE_NOT_IN_PLAN when the workspace plan lacks CSV import', async () => {
    mockedWorkspace.findById.mockResolvedValue(
      ok(createFakeWorkspace({ activePlan: 'FREE' })),
    )

    const result = await MemberService.import('actor', 'ws1', [
      { email: 'a@example.com', role: 'MEMBER' },
    ])

    expectErr(result, 'FEATURE_NOT_IN_PLAN')
    expect(mockedInvitation.create).not.toHaveBeenCalled()
  })

  it('invites every row when the plan allows it', async () => {
    mockedWorkspace.findById.mockResolvedValue(
      ok(createFakeWorkspace({ activePlan: 'PRO' })),
    )
    mockedInvitation.create.mockResolvedValue(ok(fakeInvitation()))

    const result = await MemberService.import('actor', 'ws1', [
      { email: 'a@example.com', role: 'MEMBER' },
      { email: 'b@example.com', role: 'ADMIN' },
    ])

    const summary = expectOk(result)
    expect(summary).toEqual({
      invited: 2,
      skipped: 0,
      errors: 0,
      rows: [
        { row: 1, email: 'a@example.com', status: 'invited' },
        { row: 2, email: 'b@example.com', status: 'invited' },
      ],
    })
  })

  it('skips rows that are already invited or already members', async () => {
    mockedWorkspace.findById.mockResolvedValue(
      ok(createFakeWorkspace({ activePlan: 'PRO' })),
    )
    mockedInvitation.create
      .mockResolvedValueOnce(err(invitationDuplicate()))
      .mockResolvedValueOnce(err(invitationAlreadyMember()))

    const result = await MemberService.import('actor', 'ws1', [
      { email: 'a@example.com', role: 'MEMBER' },
      { email: 'b@example.com', role: 'MEMBER' },
    ])

    const summary = expectOk(result)
    expect(summary.skipped).toBe(2)
    expect(summary.rows.map((r) => r.status)).toEqual(['skipped', 'skipped'])
  })

  it('reports unexpected invitation failures as errors', async () => {
    mockedWorkspace.findById.mockResolvedValue(
      ok(createFakeWorkspace({ activePlan: 'PRO' })),
    )
    mockedInvitation.create.mockResolvedValue(err(mailError()))

    const result = await MemberService.import('actor', 'ws1', [
      { email: 'a@example.com', role: 'MEMBER' },
    ])

    const summary = expectOk(result)
    expect(summary.errors).toBe(1)
    expect(summary.rows[0].status).toBe('error')
  })
})
