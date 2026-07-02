import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  defaultHeaders,
  deleteJson,
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
  return data as { id: string; slug: string; leadId: string }
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/members/[userId]', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(
      `${BASE_URL}/api/workspaces/ws/projects/p/members/${createId()}`,
      { method: 'DELETE', headers: defaultHeaders },
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 for a plain member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const target = await addMember(workspace.id, 'MEMBER')
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      { userId: target.id },
      user.cookie,
    )
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/${target.id}`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should refuse to remove the project lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/${project.leadId}`,
      user.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 404 when the user is not a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const target = await addMember(workspace.id, 'MEMBER')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/${target.id}`,
      user.cookie,
    )
    expect(res.status).toBe(404)
  })

  it('should remove a member (200)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const target = await addMember(workspace.id, 'MEMBER')
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members`,
      { userId: target.id },
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/${target.id}`,
      user.cookie,
    )
    expect(res.status).toBe(200)
  })
})
