import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { authenticatedOwner, getJson } from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/projects/[slug]/embed-thumbnails/[key]', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson(
      `/api/workspaces/ws/projects/slug/embed-thumbnails/${createId()}`,
    )
    expect(res.status).toBe(401)
  })

  it('should return 404 for a key with no cached thumbnail', async () => {
    const { user } = await authenticatedOwner()

    const res = await getJson(
      `/api/workspaces/ws/projects/slug/embed-thumbnails/${createId()}`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
