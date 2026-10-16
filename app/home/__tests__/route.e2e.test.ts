import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  createWorkspaceForUser,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const get = (path: string, cookie?: string) =>
  fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    headers: cookie ? { Cookie: cookie } : {},
  })

const locationPath = (res: Response) =>
  new URL(res.headers.get('location') ?? '', BASE_URL).pathname

// The root is a static marketing page; proxy.ts hands anyone carrying a
// session cookie to /home, which picks their destination.
describe('signed-in visitors of /', () => {
  it('sends a session-cookie holder from / to /home', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await get('/', cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/home')
  })

  it('serves the marketing page to a visitor without a session', async () => {
    const res = await get('/')

    expect(res.status).toBe(200)
  })
})

describe('GET /home', () => {
  it('redirects a member to their first workspace', async () => {
    const { id, cookie } = await createAuthenticatedUser()
    const workspace = await createWorkspaceForUser(id)

    const res = await get('/home', cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe(`/${workspace.slug}`)
  })

  it('redirects someone without a workspace to onboarding', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await get('/home', cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/onboarding')
  })

  it('clears a stale session cookie and returns to the public root', async () => {
    const res = await get('/home', 'better-auth.session_token=stale.token')

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/')
    expect(res.headers.getSetCookie().join('\n')).toMatch(
      /better-auth\.session_token=;.*Max-Age=0/i,
    )
  })
})
