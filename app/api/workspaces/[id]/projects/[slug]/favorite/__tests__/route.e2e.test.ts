import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  authenticatedOwner,
  deleteJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('POST/DELETE /api/workspaces/[id]/projects/[slug]/favorite', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/projects/slug/favorite', {})
    expect(res.status).toBe(401)
  })

  it('should favorite then unfavorite a project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const favRes = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/favorite`,
      {},
      user.cookie,
    )

    expect(favRes.status).toBe(200)
    const favBody = await favRes.json()
    expect(favBody.data.favorited).toBe(true)

    const unfavRes = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/favorite`,
      user.cookie,
    )

    expect(unfavRes.status).toBe(200)
    const unfavBody = await unfavRes.json()
    expect(unfavBody.data.favorited).toBe(false)
  })
})
