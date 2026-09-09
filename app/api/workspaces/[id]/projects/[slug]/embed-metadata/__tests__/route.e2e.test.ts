import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import { authenticatedOwner, postJson } from '@/src/__tests__/helpers/e2e'

describe('POST /api/workspaces/[id]/projects/[slug]/embed-metadata', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/embed-metadata',
      {
        url: 'https://www.figma.com/file/abc/Design',
      },
    )
    expect(res.status).toBe(401)
  })

  it('should return 422 for a URL with no matching embed provider', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/embed-metadata`,
      { url: 'https://example.com/not-embeddable' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 422 when the body has no url', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/embed-metadata`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should resolve metadata for a supported provider without a thumbnail fetcher', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    // Figma has no oEmbed thumbnail fetcher wired up (see
    // EmbedThumbnailService), so this resolves without an outbound network
    // call and stays deterministic in e2e.
    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/embed-metadata`,
      { url: 'https://www.figma.com/file/abc123/Design' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.provider).toBe('figma')
    expect(body.data.thumbnailKey).toBeNull()
  })
})
