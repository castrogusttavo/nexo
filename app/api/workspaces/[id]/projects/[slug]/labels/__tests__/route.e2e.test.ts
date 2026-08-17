import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

describe('GET /api/workspaces/[id]/projects/[slug]/labels', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/labels')
    expect(res.status).toBe(401)
  })

  it('should list labels for a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await seedLabel(project.id, { name: 'Design' })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/labels', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/labels')
    expect(res.status).toBe(401)
  })

  it('should return 422 for invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 when non-lead MEMBER tries to create', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels`,
      { name: 'Bug' },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to create a label', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels`,
      { name: 'Bug' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Bug')
    expect(body.data.color).toBe('ZINC')
  })
})
