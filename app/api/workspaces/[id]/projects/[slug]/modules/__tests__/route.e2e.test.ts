import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedProject(workspaceId: string, leadId: string) {
  const result = await ProjectRepository.create({
    name: 'E2E Project',
    slug: `proj-${Math.random().toString(36).slice(2, 10)}`,
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

describe('GET /api/workspaces/[id]/projects/[slug]/modules', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/modules')
    expect(res.status).toBe(401)
  })

  it('should list modules for a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules`,
      { name: 'Auth' },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/modules', () => {
  it('should return 403 when non-lead MEMBER tries to create', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules`,
      { name: 'Auth' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to create a module with themselves as lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules`,
      { name: 'Auth' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.leadId).toBe(user.id)
  })
})
