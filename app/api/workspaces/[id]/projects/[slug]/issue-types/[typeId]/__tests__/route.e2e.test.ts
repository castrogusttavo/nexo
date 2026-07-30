import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedProject(workspaceId: string, leadId: string) {
  const result = await ProjectRepository.create({
    name: 'E2E Project',
    slug: `proj-${createId().slice(0, 8)}`,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    leadId,
    workspaceId,
  })
  if (!result.ok) throw new Error('failed to seed project')
  return result.value
}

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
