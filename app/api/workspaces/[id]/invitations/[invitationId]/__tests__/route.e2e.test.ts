import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createInvite,
  deleteJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedInvite(workspaceId: string, cookie: string) {
  await createInvite(workspaceId, cookie)
  return prisma.workspaceInvitation.findFirstOrThrow({ where: { workspaceId } })
}

describe('DELETE /api/workspaces/[id]/invitations/[invitationId]', () => {
  it('should return 403 for a plain MEMBER', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invite = await seedInvite(workspace.id, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/invitations/${invite.id}`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 404 when the invite belongs to another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const other = await authenticatedOwner()
    const foreign = await seedInvite(other.workspace.id, other.user.cookie)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/invitations/${foreign.id}`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('should revoke (200) and 409 on the second revoke', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invite = await seedInvite(workspace.id, user.cookie)
    const path = `/api/workspaces/${workspace.id}/invitations/${invite.id}`

    expect((await deleteJson(path, user.cookie)).status).toBe(200)
    expect((await deleteJson(path, user.cookie)).status).toBe(409)
  })
})
