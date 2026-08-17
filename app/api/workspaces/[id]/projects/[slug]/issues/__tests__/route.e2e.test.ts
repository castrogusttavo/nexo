import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/projects/[slug]/issues', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/projects/slug/issues', {})
    expect(res.status).toBe(401)
  })

  it('should list issues for a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/issues', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug/issues')
    expect(res.status).toBe(401)
  })

  it('should return 422 for invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      { title: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should default typeId to the system Task type and assign sequential number', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.number).toBe(1)
    expect(body.data.title).toBe('Bug')
  })
})
