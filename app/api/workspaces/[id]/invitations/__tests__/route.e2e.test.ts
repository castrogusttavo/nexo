import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createInvite,
  defaultHeaders,
  getJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

describe('POST /api/workspaces/[id]/invitations', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/ws/invitations`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ email: 'x@example.com', role: 'MEMBER' }),
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when the actor is a plain MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const res = await createInvite(workspace.id, member.cookie)
    expect(res.status).toBe(403)
  })

  it('should return 422 for an invalid email', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await createInvite(workspace.id, user.cookie, 'nope')
    expect(res.status).toBe(422)
  })

  it('should return 422 when role is OWNER (not invitable)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await createInvite(
      workspace.id,
      user.cookie,
      'a@b.com',
      'OWNER',
    )
    expect(res.status).toBe(422)
  })

  it('should create (201) and reject duplicate (409)', async () => {
    const { user, workspace } = await authenticatedOwner()
    expect((await createInvite(workspace.id, user.cookie)).status).toBe(201)
    expect((await createInvite(workspace.id, user.cookie)).status).toBe(409)
  })

  it('should return 409 when the email is already a member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const res = await createInvite(workspace.id, user.cookie, member.email)
    expect(res.status).toBe(409)
  })

  it('should allow an ADMIN to invite', async () => {
    const { workspace } = await authenticatedOwner()
    const admin = await addMember(workspace.id, 'ADMIN')
    expect((await createInvite(workspace.id, admin.cookie)).status).toBe(201)
  })
})

describe('GET /api/workspaces/[id]/invitations', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson('/api/workspaces/ws/invitations')).status).toBe(401)
  })

  it('should return 403 for a plain MMEBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const res = await getJson(
      `/api/workspaces/${workspace.id}/invitations`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should list invites without exposing the token', async () => {
    const { user, workspace } = await authenticatedOwner()
    await createInvite(workspace.id, user.cookie, 'listed@example.com')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/invitations`,
      user.cookie,
    )
    expect(res.status).toBe(200)

    const { data } = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].email).toBe('listed@example.com')
    expect(data[0].token).toBeUndefined()
  })
})
