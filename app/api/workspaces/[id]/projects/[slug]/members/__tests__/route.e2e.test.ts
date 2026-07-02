import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  defaultHeaders,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

async function createProject(workspaceId: string, cookie: string) {
  const slug = `p-${createId().slice(0, 8)}`
  const res = await postJson(
    `/api/workspaces/${workspaceId}/projects`,
    { name: 'Proj', slug },
    cookie,
  )
  const { data } = await res.json()
  return data as { id: string; slug: string }
}

describe('POST /api/workspaces/[id]/projects/[slug]/members', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(
      `${BASE_URL}/api/workspaces/ws/projects/p/members`,
      {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ userId: createId() }),
      },
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 when the actor is a plain member (not lead/privileged)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')
    const target = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      { userId: target.id },
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 when userId is invalid', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      { userId: 'not-a-cuid' },
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 409 when the target is not a workspace member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const outsider = await createAuthenticatedUser()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      { userId: outsider.id },
      user.cookie,
    )
    expect(res.status).toBe(409)
  })

  it('should add a member (201) and reject the duplicate (409)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const target = await addMember(workspace.id, 'MEMBER')
    const path = `/api/workspaces/${workspace.id}/projects/${project.slug}/members`

    expect(
      (await postJson(path, { userId: target.id }, user.cookie)).status,
    ).toBe(201)
    expect(
      (await postJson(path, { userId: target.id }, user.cookie)).status,
    ).toBe(409)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/members', () => {
  it('should return 403 for a plain member of a private project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should list members with the lead flagged for the owner', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      user.cookie,
    )
    expect(res.status).toBe(200)

    const { data } = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].isLead).toBe(true)
  })
})
