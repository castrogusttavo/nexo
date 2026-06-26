import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  createAuthenticatedUser,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

// Don't reuse `defaultHeaders` here: it forces `Content-Type`: application/json
// witch would clobber the multipart boundary that `fetch` sets from FormData
function fileForm(type: string, name = 'cover') {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array([1, 2, 3])], name, { type }))
  return fd
}

function url(workspaceId: string) {
  return `${BASE_URL}/api/workspaces/${workspaceId}/projects/cover-image`
}

describe('POST /api/workspaces/[id]/projects/cover-image', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(url('some-id'), {
      method: 'POST',
      body: fileForm('image/png', 'cover.png'),
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when the is not a workspace member', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    // A valid file is sent so the request reaches the membership check
    // (the service authorizes before it would touch storage).
    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: stranger.cookie },
      body: fileForm('image/png', 'cover.png'),
    })
    expect(res.status).toBe(403)
  })

  it('should reject a missing file with 422', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: new FormData(),
    })
    expect(res.status).toBe(422)
  })

  it('should reject a non-image file with 422', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: fileForm('application/pdf', 'doc.pdf'),
    })
    expect(res.status).toBe(422)
  })

  it('should reject an image outside the jpeg/png/webp whitelist with 422', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: fileForm('image/gif', 'doc.gif'),
    })
    expect(res.status).toBe(422)
  })
})
