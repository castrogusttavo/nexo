import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  getJson,
  patchJson,
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

describe('GET /api/workspaces/[id]/projects/[slug]/estimate', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/estimate')
    expect(res.status).toBe(401)
  })

  it('should return the default settings seeded on project creation', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.system).toBe('POINTS')
    expect(body.data.model).toBe('FIBONACCI')
  })
})

describe('PATCH /api/workspaces/[id]/projects/[slug]/estimate', () => {
  it('should return 422 when model is incompatible with system', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      { system: 'TIME', model: 'FIBONACCI' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 when non-lead MEMBER tries to update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      { system: 'TIME', model: 'HOURS' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to update system and model', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      { system: 'TIME', model: 'HOURS' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.system).toBe('TIME')
    expect(body.data.model).toBe('HOURS')
  })
})
