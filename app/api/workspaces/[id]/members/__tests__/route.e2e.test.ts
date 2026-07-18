import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  getJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/members', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson('/api/workspaces/ws/members')).status).toBe(401)
  })

  it('should return 403 for a plain MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const res = await getJson(
      `/api/workspaces/${workspace.id}/members`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 for an invalid sortBy', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await getJson(
      `/api/workspaces/${workspace.id}/members?sortBy=invalid`,
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should list the owner as the sole member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await getJson(
      `/api/workspaces/${workspace.id}/members`,
      user.cookie,
    )
    expect(res.status).toBe(200)

    const { data } = await res.json()
    expect(data.total).toBe(1)
    expect(data.members[0].role).toBe('OWNER')
    expect(data.members[0].userId).toBe(user.id)
  })

  it('should fitler by role', async () => {
    const { user, workspace } = await authenticatedOwner()
    await addMember(workspace.id, 'VIEWER')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/members?roles=VIEWER`,
      user.cookie,
    )

    const { data } = await res.json()
    expect(data.total).toBe(1)
    expect(data.members[0].role).toBe('VIEWER')
  })
})
