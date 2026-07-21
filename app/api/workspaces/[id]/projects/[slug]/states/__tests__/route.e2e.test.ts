import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedProject(workspaceId: string, leadId: string) {
  return prisma.project.create({
    data: {
      name: 'E2E Project',
      slug: `proj-${createId().slice(0, 8)}`,
      workspaceId,
      leadId,
    },
  })
}

describe('GET /api/workspaces/[id]/projects/[slug]/states', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/states')
    expect(res.status).toBe(401)
  })

  it('should list states for a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await seedState(project.id, { name: 'Todo', group: 'UNSTARTED' })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/states', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/projects/slug/states', {})
    expect(res.status).toBe(401)
  })

  it('should return 422 for invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should allow lead to create a state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states`,
      { name: 'Custom', group: 'STARTED' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Custom')
    expect(body.data.color).toBe('ZINC')
  })
})
