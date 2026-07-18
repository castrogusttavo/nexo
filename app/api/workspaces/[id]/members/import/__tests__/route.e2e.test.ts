import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  createAuthenticatedUser,
  createWorkspaceForUser,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

function csvForm(csv: string) {
  const fd = new FormData()
  fd.append('file', new File([csv], 'members.csv', { type: 'text/csv' }))
  return fd
}

function url(workspaceId: string) {
  return `${BASE_URL}/api/workspaces/${workspaceId}/members/import`
}

// importMembersCsv is a Pro-tier feature (src/config/plans.ts), so the
// happy-path tests need a Pro workspace — authenticatedOwner() defaults to FREE.
async function authenticatedProOwner() {
  const user = await createAuthenticatedUser()
  const workspace = await createWorkspaceForUser(user.id, {
    role: 'OWNER',
    activePlan: 'PRO',
  })
  return { user, workspace }
}

describe('POST /api/workspaces/[id]/members/import', () => {
  it('should return 422 when required columns are missing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: csvForm('email,role\na@example.com,MEMBER'),
    })
    expect(res.status).toBe(422)
  })

  it('should return 422 for an empty CSV', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: csvForm('email,username,name,role'),
    })
    expect(res.status).toBe(422)
  })

  it('should return 403 on a FREE workspace (importMembersCsv is a Pro feature)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: csvForm(
        'email,username,name,role\nnew1@example.com,new1,New One,MEMBER',
      ),
    })
    expect(res.status).toBe(403)
  })

  it('should create one invitation per valid row on a Pro workspace', async () => {
    const { user, workspace } = await authenticatedProOwner()
    const res = await fetch(url(workspace.id), {
      method: 'POST',
      headers: { Cookie: user.cookie },
      body: csvForm(
        'email,username,name,role\nnew1@example.com,new1,New One,MEMBER\nnew2@example.com,new2,New Two,ADMIN',
      ),
    })
    expect(res.status).toBe(201)

    const { data } = await res.json()
    expect(data.invited).toBe(2)
  })
})
