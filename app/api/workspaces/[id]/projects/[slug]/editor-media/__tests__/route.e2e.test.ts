import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  authenticatedOwner,
  createAuthenticatedUser,
  getJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

// Don't reuse `defaultHeaders`: it forces `Content-Type: application/json`,
// which would clobber the multipart boundary `fetch` sets from FormData.
function fileForm(type: string, name = 'image.png') {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array([1, 2, 3])], name, { type }))
  return fd
}

function url(workspaceId: string, slug: string) {
  return `${BASE_URL}/api/workspaces/${workspaceId}/projects/${slug}/editor-media`
}

describe('POST /api/workspaces/[id]/projects/[slug]/editor-media', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(url('ws', 'slug'), {
      method: 'POST',
      body: fileForm('image/png'),
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when the actor is not a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const stranger = await createAuthenticatedUser()

    const res = await fetch(url(workspace.id, project.slug), {
      method: 'POST',
      headers: { Cookie: stranger.cookie },
      body: fileForm('image/png'),
    })

    expect(res.status).toBe(403)
  })

  it('should reject a missing file with 422', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await fetch(url(workspace.id, project.slug), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: new FormData(),
    })

    expect(res.status).toBe(422)
  })

  it('should reject an unsupported content type with 422', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await fetch(url(workspace.id, project.slug), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: fileForm('application/x-msdownload', 'file.exe'),
    })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/editor-media', () => {
  it('should return 422 when the key query param is missing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/editor-media`,
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})
