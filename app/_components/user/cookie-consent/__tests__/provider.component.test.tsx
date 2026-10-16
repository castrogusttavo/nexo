import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookieConsentProvider, useCookieConsent } from '../provider'

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(() => ({ data: null })),
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession },
}))

function wrapper(isAuthenticated: boolean) {
  return ({ children }: { children: ReactNode }) => (
    <CookieConsentProvider initial='rejected' isAuthenticated={isAuthenticated}>
      {children}
    </CookieConsentProvider>
  )
}

// What the root layout renders: nothing handed in, both read in the browser.
function browserWrapper({ children }: { children: ReactNode }) {
  return <CookieConsentProvider>{children}</CookieConsentProvider>
}

function setConsentCookie(value: string | null) {
  // biome-ignore lint/suspicious/noDocumentCookie: test fixture for the consent cookie.
  document.cookie =
    value === null
      ? 'nx_cookie_consent=; path=/; max-age=0'
      : `nx_cookie_consent=${value}; path=/`
}

afterEach(() => {
  setConsentCookie(null)
  useSession.mockReset()
  useSession.mockReturnValue({ data: null })
})

describe('useCookieConsent', () => {
  it('exposes the consent and session it was handed', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: wrapper(true),
    })

    expect(result.current.consent).toBe('rejected')
    expect(result.current.ready).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('does not ask Better Auth for the session when it was handed one', () => {
    renderHook(() => useCookieConsent(), { wrapper: wrapper(false) })

    expect(useSession).not.toHaveBeenCalled()
  })

  it('reads the consent cookie in the browser when none was handed in', async () => {
    setConsentCookie('accepted')

    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: browserWrapper,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.consent).toBe('accepted')
  })

  it('treats a missing cookie as undecided once read', async () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: browserWrapper,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.consent).toBeNull()
  })

  it("takes who is signed in from Better Auth's client session", async () => {
    useSession.mockReturnValue({ data: { user: { id: 'user-1' } } } as never)

    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: browserWrapper,
    })

    await waitFor(() => expect(result.current.userId).toBe('user-1'))
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('stays anonymous without a client session', async () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: browserWrapper,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.userId).toBeNull()
  })

  it('refuses to be used outside the provider', () => {
    // React logs the thrown error from the failed render; silence it so the
    // expected failure does not read like a broken test.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useCookieConsent())).toThrow(
      'useCookieConsent must be used inside <CookieConsentProvider>',
    )

    consoleError.mockRestore()
  })
})
