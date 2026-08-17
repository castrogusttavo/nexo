import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

describe('GET /api/workspaces/[id]/projects/[slug]/cycles', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/cycles')
    expect(res.status).toBe(401)
  })

  it('should list cycles for a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      { name: 'Sprint 1' },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/cycles', () => {
  it('should return 403 when non-lead MEMBER tries to create', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      { name: 'Sprint 1' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should return 409 when creating a second IN_PROGRESS cycle', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      { name: 'Sprint 1', status: 'IN_PROGRESS' },
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      { name: 'Sprint 2', status: 'IN_PROGRESS' },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('CYCLE_ALREADY_ACTIVE')
  })

  it('should allow lead to create a cycle with themselves as lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles`,
      { name: 'Sprint 1' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.leadId).toBe(user.id)
  })
})
