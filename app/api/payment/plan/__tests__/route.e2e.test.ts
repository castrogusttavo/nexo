import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  defaultHeaders,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

// NOTE: success path (201 with subscription created) is intentionally NOT
// tested here because it would require either a live AbacatePay sandbox or
// patching `lib/abacatepay.ts` to support a configurable base URL pointing to
// a mock server. The auth/RBAC/validation paths below all short-circuit
// before AbacatePay is invoked.

describe('POST /api/payment/plan', () => {
  it('should redirect to /sign-in via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/payment/plan`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ plan: 'PRO', workspaceId: 'ws-x' }),
      redirect: 'manual',
    })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/sign-in')
  })

  it('should return 422 when plan is missing', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/payment/plan',
      { workspaceId: 'ws-x' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 for unknown plan', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/payment/plan',
      { plan: 'GOD_MODE', workspaceId: 'ws-x' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 for BASIC plan (not purchasable)', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/payment/plan',
      { plan: 'BASIC', workspaceId: 'ws-x' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when workspaceId is empty', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/payment/plan',
      { plan: 'PRO', workspaceId: '' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 403 when user is not a member of workspace', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    const res = await postJson(
      '/api/payment/plan',
      { plan: 'PRO', workspaceId: workspace.id },
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 403 when caller is MEMBER (not OWNER/ADMIN)', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      '/api/payment/plan',
      { plan: 'PRO', workspaceId: workspace.id },
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 403 when caller is VIEWER', async () => {
    const { workspace } = await authenticatedOwner()
    const viewer = await addMember(workspace.id, 'VIEWER')

    const res = await postJson(
      '/api/payment/plan',
      { plan: 'PRO', workspaceId: workspace.id },
      viewer.cookie,
    )
    expect(res.status).toBe(403)
  })
})
