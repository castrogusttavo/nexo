import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

// Don't reuse `defaultHeaders` here: it forces `Content-Type: application/json`
// which would clobber the multipart boundary that `fetch` sets from FormData
function logoForm(type: string, name = 'logo') {
  const fd = new FormData()
  fd.append('logo', new File([new Uint8Array([1, 2, 3])], name, { type }))
  return fd
}

function url(workspaceId: string) {
  return `${BASE_URL}/api/workspaces/${workspaceId}/logo`
}

describe('POST /api/workspaces/[id]/logo', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(url('some-id'), {
      method: 'POST',
      body: logoForm('image/png', 'logo.png'),
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when the user is not a workspace member', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: stranger.cookie },
      body: logoForm('image/png', 'logo.png'),
    })
    expect(res.status).toBe(403)
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('should return 403 for a %s (only OWNER/ADMIN change the logo)', async (role) => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, role)

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: member.cookie },
      body: logoForm('image/png', 'logo.png'),
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

  it('should reject a file sent under the wrong field with 422', async () => {
    const { user, workspace } = await authenticatedOwner()
    const fd = new FormData()
    fd.append(
      'file',
      new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' }),
    )

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: fd,
    })
    expect(res.status).toBe(422)
  })

  it('should reject a non-image file with 422', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: logoForm('application/pdf', 'doc.pdf'),
    })
    expect(res.status).toBe(422)
  })

  it('should reject an image outside the jpeg/png/webp whitelist with 422', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: logoForm('image/gif', 'logo.gif'),
    })
    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/workspaces/[id]/logo', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(url('some-id'), { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('should return 403 when the user is not a workspace member', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    const res = await fetch(url(workspace.id), {
      method: 'DELETE',
      headers: { Cookie: stranger.cookie },
    })
    expect(res.status).toBe(403)
  })

  it('should return 403 for a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await fetch(url(workspace.id), {
      method: 'DELETE',
      headers: { Cookie: member.cookie },
    })
    expect(res.status).toBe(403)
  })

  it('should return 200 for the OWNER even when there is no logo', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await fetch(url(workspace.id), {
      method: 'DELETE',
      headers: { Cookie: user.cookie },
    })
    expect(res.status).toBe(200)
  })
})
