import type { Project, Role } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import type { ErrorCode } from '@/src/errors/codes'
import { ok, type Result } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'

// Access matrix for the project gate that a dozen services repeat inline:
//
//   const isLead = project.leadId === actorId
//   const isMember = project.members.some((m) => m.userId === actorId)
//   if (!isPublic && !isPrivileged && !isLead && !isMember) return forbidden
//
// Mutation testing showed the suites never proved the gate in either
// direction: every "allowed" test used an actor who was lead AND member AND
// the only member, so hardcoding `isLead = false`, `isMember = true` or
// swapping `.some` for `.every` all survived. Each case below isolates one
// arm — the only reason the actor gets in is the arm under test — and the
// deny cases always run against a populated member list.
//
// Not a test file on its own (no `.test.ts` suffix): the calling suite must
// `vi.mock` the membership and project repositories, as every service suite
// already does.

export const GATE_ACTOR = 'actor'
export const GATE_WORKSPACE = 'ws1'
export const GATE_PROJECT_ID = 'proj-1'

export interface GatedMethod {
  /** Label for the describe block, e.g. `create()`. */
  name: string
  /**
   * Who gets through besides OWNER/ADMIN and the project lead:
   * `member` — any project member (reads and issue-level work);
   * `lead` — nobody else (project configuration: states, labels, cycles…).
   */
  grants: 'member' | 'lead'
  /** The gate also opens for any workspace member when the project is public. */
  publicGrants?: boolean
  forbiddenCode: ErrorCode
  /** Extra fields for the resolved project (e.g. a feature flag the method checks). */
  project?: Partial<Project>
  /** Mocks everything past the gate so an admitted actor reaches `ok()`. */
  arrange: () => void
  call: (actorId: string) => Promise<Result<unknown>>
  /** Repository calls that must never run when the gate says no. */
  sideEffects?: () => unknown[]
}

function membershipWith(role: Role) {
  return createFakeMembership({
    userId: GATE_ACTOR,
    workspaceId: GATE_WORKSPACE,
    role,
  })
}

function withGate(
  method: GatedMethod,
  {
    role = 'MEMBER',
    leadId = 'lead-1',
    members,
    isPublic = false,
  }: {
    role?: Role
    leadId?: string | null
    members: { userId: string }[]
    isPublic?: boolean
  },
) {
  method.arrange()
  vi.mocked(MembershipRepository.findByUserAndWorkspace).mockResolvedValue(
    ok(membershipWith(role)),
  )
  vi.mocked(ProjectRepository.findByWorkspaceAndSlug).mockResolvedValue(
    ok({
      ...createFakeProject({
        workspaceId: GATE_WORKSPACE,
        ...method.project,
        id: GATE_PROJECT_ID,
        leadId,
        isPublic,
      }),
      members,
      favourites: [],
    }),
  )
}

async function expectDenied(method: GatedMethod) {
  expectErr(await method.call(GATE_ACTOR), method.forbiddenCode)
  for (const effect of method.sideEffects?.() ?? []) {
    expect(effect).not.toHaveBeenCalled()
  }
}

export function describeProjectAccessGate(
  service: string,
  methods: GatedMethod[],
) {
  describe(`${service} project access gate`, () => {
    describe.each(
      methods.map((m) => [m.name, m] as const),
    )('%s', (_, method) => {
      it('admits the project lead who is not on the member list', async () => {
        withGate(method, {
          leadId: GATE_ACTOR,
          members: [{ userId: 'other-1' }],
        })

        expectOk(await method.call(GATE_ACTOR))
      })

      it.each([
        'OWNER',
        'ADMIN',
      ] as const)('admits a workspace %s who is neither lead nor member', async (role) => {
        withGate(method, { role, members: [{ userId: 'other-1' }] })

        expectOk(await method.call(GATE_ACTOR))
      })

      if (method.grants === 'member') {
        it('admits one member among several', async () => {
          withGate(method, {
            members: [
              { userId: 'other-1' },
              { userId: GATE_ACTOR },
              { userId: 'other-2' },
            ],
          })

          expectOk(await method.call(GATE_ACTOR))
        })
      } else {
        it('denies a plain project member who is not the lead', async () => {
          withGate(method, {
            members: [
              { userId: 'other-1' },
              { userId: GATE_ACTOR },
              { userId: 'other-2' },
            ],
          })

          await expectDenied(method)
        })
      }

      it('denies an actor absent from a populated member list', async () => {
        withGate(method, {
          members: [{ userId: 'other-1' }, { userId: 'other-2' }],
        })

        await expectDenied(method)
      })

      it('does not treat a null lead (deleted user) as a grant', async () => {
        withGate(method, {
          leadId: null,
          members: [{ userId: 'other-1' }, { userId: 'other-2' }],
        })

        await expectDenied(method)
      })

      if (method.publicGrants) {
        it('admits any workspace member when the project is public', async () => {
          withGate(method, {
            isPublic: true,
            leadId: null,
            members: [{ userId: 'other-1' }],
          })

          expectOk(await method.call(GATE_ACTOR))
        })
      }

      if (method.grants === 'lead') {
        it('does not open to a plain member because the project is public', async () => {
          withGate(method, {
            isPublic: true,
            members: [{ userId: GATE_ACTOR }, { userId: 'other-1' }],
          })

          await expectDenied(method)
        })
      }
    })
  })
}
