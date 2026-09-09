import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  createAuthenticatedUser,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/projects/[slug]/issues/by-identifier/[identifier]', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson(
      '/api/workspaces/ws/projects/slug/issues/by-identifier/proj-1',
    )
    expect(res.status).toBe(401)
  })

  it('should return the issue by its readable identifier', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: [{ type: 'p', children: [{ text: '' }] }],
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )
    const { data: issue } = await created.json()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/by-identifier/${project.slug}-${issue.number}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(issue.id)
  })

  it('should return 404 for an identifier with no matching number', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/by-identifier/${project.slug}-999`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('should return 403 for a non-member of a private project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)
    const stranger = await createAuthenticatedUser()

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: [{ type: 'p', children: [{ text: '' }] }],
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )
    const { data: issue } = await created.json()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/by-identifier/${project.slug}-${issue.number}`,
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })
})
