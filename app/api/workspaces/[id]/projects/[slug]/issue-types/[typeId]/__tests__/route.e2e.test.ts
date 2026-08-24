import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

async function systemType(workspaceId: string, slug: string, cookie: string) {
  const res = await getJson(
    `/api/workspaces/${workspaceId}/projects/${slug}/issue-types`,
    cookie,
  )
  const body = await res.json()
  return body.data.find((t: { name: string }) => t.name === 'Task')
}

describe('PATCH /api/workspaces/[id]/projects/[slug]/issue-types/[typeId]', () => {
  it('should return 403 when non-lead MEMBER tries to update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const type = await systemType(workspace.id, project.slug, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types/${type.id}`,
      { name: 'Renamed' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should return 409 when updating a system type (Task/Epic)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const type = await systemType(workspace.id, project.slug, user.cookie)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types/${type.id}`,
      { name: 'Renamed' },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_TYPE_SYSTEM_PROTECTED')
  })

  it('should allow lead to rename a custom type', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types`,
      { name: 'Bug', icon: 'bug-icon' },
      user.cookie,
    )
    const { data } = await created.json()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types/${data.id}`,
      { name: 'Defect' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Defect')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/issue-types/[typeId]', () => {
  it('should return 409 when updating a system type (Task/Epic)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const type = await systemType(workspace.id, project.slug, user.cookie)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types/${type.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_TYPE_SYSTEM_PROTECTED')
  })
})
