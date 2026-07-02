import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createInvite,
  deleteJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedInvite(workspaceId: string, cookie: string) {
  await createInvite(workspaceId, cookie)
  return prisma.workspaceInvitation.findFirstOrThrow({ where: { workspaceId } })
}

describe('POST /api/workspaces/[id]/invitations/[invitationId]/resend', () => {
  it('should return 403 for a plain MEMBER', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invite = await seedInvite(workspace.id, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/invitations/${invite.id}/resend`,
      {},
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should rotate the token and keep it PENDING', async () => {
    const { user, workspace } = await authenticatedOwner()
    const before = await seedInvite(workspace.id, user.cookie)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/invitations/${before.id}/resend`,
      {},
      user.cookie,
    )
    expect(res.status).toBe(200)

    const after = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: before.id },
    })
    expect(after.token).not.toBe(before.token)
    expect(after.status).toBe('PENDING')
  })

  it('should return 409 when resending a revoked invite', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invite = await seedInvite(workspace.id, user.cookie)

    await deleteJson(
      `/api/workspaces/${workspace.id}/invitations/${invite.id}`,
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/invitations/${invite.id}/resend`,
      {},
      user.cookie,
    )
    expect(res.status).toBe(409)
  })
})
