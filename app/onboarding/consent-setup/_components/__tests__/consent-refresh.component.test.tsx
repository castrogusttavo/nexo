import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsentRefresh } from '../consent-refresh'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { getSession } }))

const replace = vi.fn()

beforeEach(() => {
  // jsdom's Location cannot be spied on; the component only needs `replace`.
  vi.stubGlobal('location', { replace })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('<ConsentRefresh />', () => {
  it('renders nothing on screen', () => {
    getSession.mockReturnValue(new Promise(() => {}))

    const { container } = render(<ConsentRefresh to='/acme' />)

    expect(container).toBeEmptyDOMElement()
  })

  it('re-reads the session from the database, then leaves with a full navigation', async () => {
    let settle: (value: unknown) => void = () => {}
    getSession.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve
      }),
    )

    render(<ConsentRefresh to='/acme' />)

    expect(getSession).toHaveBeenCalledExactlyOnceWith({
      query: { disableCookieCache: true },
    })
    // The cookie cache must be re-issued before the proxy sees the request.
    expect(replace).not.toHaveBeenCalled()

    settle({ data: null, error: null })

    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith('/acme'),
    )
  })
})
