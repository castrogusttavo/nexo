import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/project-states', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects-states')
    expect(res.status).toBe(401)
  })

  it('should list the six default states to any member', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/project-states`,
      member.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.map((s: { group: string }) => s.group)).toEqual([
      'DRAFT',
      'PLANNING',
      'EXECUTION',
      'MONITORING',
      'COMPLETED',
      'CANCELLED',
    ])
    expect(
      body.data.filter((s: { isDefault: boolean }) => s.isDefault),
    ).toHaveLength(1)
  })

  it('should return 403 to someone outside the workspace', async () => {
    const { workspace } = await authenticatedOwner()
    const outsider = await createAuthenticatedUser()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/project-states`,
      outsider.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('POST /api/workspaces/[api]/project-states', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/project-states', {})
    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-states`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should let an ADMIN create a state, not the default, ZINC by default', async () => {
    const { workspace } = await authenticatedOwner()
    const admin = await addMember(workspace.id, 'ADMIN')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-states`,
      { name: 'Em revisão', group: 'MONITORING' },
      admin.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toMatchObject({
      name: 'Em revisão',
      group: 'MONITORING',
      color: 'ZINC',
      isDefault: false,
      workspaceId: workspace.id,
    })
  })

  it('should return 403 PROJECT_STATE_FORBIDDEN to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-states`,
      { name: 'Em revisão', group: 'MONITORING' },
      member.cookie,
    )

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_FORBIDDEN')
  })

  it('should return 409 PROJECT_STATE_ALREADY_EXISTS for a taken name', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-states`,
      { name: 'Rascunho', group: 'DRAFT' },
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_ALREADY_EXISTS')
  })
})
