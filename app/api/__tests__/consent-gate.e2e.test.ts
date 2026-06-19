import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

const GATED: Array<{
  name: string
  call: (cookie: string) => Promise<Response>
}> = [
  {
    name: 'POST /api/workspaces',
    call: (c) =>
      postJson(
        '/api/workspaces',
        { name: 'XY', slug: `x-${Date.now()}` },
        { cookie: c },
      ),
  },
  {
    name: 'PATCH /api/workspaces/:id',
    call: (c) =>
      patchJson('/api/workspaces/ws_dumy', { name: 'Yy' }, { cookie: c }),
  },
  {
    name: 'DELETE /api/workspaces/:id',
    call: (c) => deleteJson('/api/workspaces/ws_dumy', { cookie: c }),
  },
  {
    name: 'POST /api/short-links',
    call: (c) =>
      postJson(
        '/api/short-links',
        { url: 'https://example.com' },
        { cookie: c },
      ),
  },
  {
    name: 'PATCH /api/short-links/:id',
    call: (c) =>
      patchJson(
        '/api/short-links/sl_dumy',
        { url: 'https://example.com' },
        { cookie: c },
      ),
  },
  {
    name: 'DELETE /api/short-links/:id',
    call: (c) => deleteJson('/api/short-links/sl_dumy', { cookie: c }),
  },
  {
    name: 'POST /api/sticky-notes',
    call: (c) => postJson('/api/sticky-notes', {}, { cookie: c }),
  },
  {
    name: 'PATCH /api/sticky-notes/:id',
    call: (c) =>
      patchJson('/api/sticky-notes/sn_dumy', { content: 'z' }, { cookie: c }),
  },
  {
    name: 'DELETE /api/sticky-notes/:id',
    call: (c) => deleteJson('/api/sticky-notes/sn_dumy', { cookie: c }),
  },
  {
    name: 'POST /api/payment/plan',
    call: (c) => postJson('/api/payment/plan', {}, { cookie: c }),
  },
]

describe('consent gate - authenticated but unconsented user', () => {
  it.each(GATED)('blocks $name with the consent gate(403)', async ({
    call,
  }) => {
    const user = await createAuthenticatedUser({ skipConsent: true })
    const res = await call(user.cookie)

    expect(res.status).toBe(403)
    const body = (await res.json()) as {
      error?: { code?: string }
      message?: string
    }
    expect(body.message).toContain('Consentimento')
  })

  it('dows not block a consented user (POST /api/workspace -> 201', async () => {
    const user = await createAuthenticatedUser()

    const res = await postJson(
      '/api/workspaces',
      { name: 'Consented WS', slug: `x-${Date.now()}` },
      { cookie: user.cookie },
    )

    expect(res.status).toBe(201)
  })

  it('blocks an unconsented user from /create-workspace (soft redirect by layout)', async () => {
    const user = await createAuthenticatedUser({ skipConsent: true })
    const res = await getJson('/create-workspace', { cookie: user.cookie })
    const body = await res.text()

    expect(body).toContain('/onboarding/consent')
  })
})
