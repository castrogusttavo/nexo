import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  createAuthenticatedUser,
  createInvite,
  defaultHeaders,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

async function inviteFor(workspaceId: string, cookie: string, email: string) {
  await createInvite(workspaceId, cookie, email)
  return prisma.workspaceInvitation.findFirstOrThrow({
    where: { workspaceId, email },
  })
}

describe('POST /api/invitations/accept', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/invitations/accept`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ token: 'whatever' }),
    })
    expect(res.status).toBe(401)
  })

  it('should return 422 when the token is missing', async () => {
    const user = await createAuthenticatedUser()
    const res = await postJson('/api/invitations/accept', {}, user.cookie)
    expect(res.status).toBe(422)
  })

  it('should return 404 for an unknown token', async () => {
    const user = await createAuthenticatedUser()
    const res = await postJson(
      '/api/invitations/accept',
      { token: 'does-not-exist' },
      user.cookie,
    )
    expect(res.status).toBe(404)
  })

  it('should return 403 when the account email does not match', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invite = await inviteFor(
      workspace.id,
      user.cookie,
      'target@example.com',
    )

    const stranger = await createAuthenticatedUser()
    const res = await postJson(
      '/api/invitations/accept',
      { token: invite.token },
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 410 when the invite is expired', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invitee = await createAuthenticatedUser()
    const invite = await inviteFor(workspace.id, user.cookie, invitee.email)
    await prisma.workspaceInvitation.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const res = await postJson(
      '/api/invitations/accept',
      { token: invite.token },
      invitee.cookie,
    )
    expect(res.status).toBe(410)
  })

  it('should accept (200), create the membership, and 409 on re-accept', async () => {
    const { user, workspace } = await authenticatedOwner()
    const invitee = await createAuthenticatedUser()
    const invite = await inviteFor(workspace.id, user.cookie, invitee.email)

    const accept = await postJson(
      '/api/invitations/accept',
      { token: invite.token },
      invitee.cookie,
    )
    expect(accept.status).toBe(200)
    expect((await accept.json()).data.slug).toBe(workspace.slug)

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: invitee.id, workspaceId: workspace.id },
      },
    })
    expect(membership).not.toBeNull()

    const again = await postJson(
      '/api/invitations/accept',
      { token: invite.token },
      invitee.cookie,
    )
    expect(again.status).toBe(409)
  })
})
