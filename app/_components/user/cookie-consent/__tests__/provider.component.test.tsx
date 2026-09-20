import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CookieConsentProvider, useCookieConsent } from '../provider'

function wrapper(isAuthenticated: boolean) {
  return ({ children }: { children: ReactNode }) => (
    <CookieConsentProvider initial='rejected' isAuthenticated={isAuthenticated}>
      {children}
    </CookieConsentProvider>
  )
}

describe('useCookieConsent', () => {
  it('exposes the server-rendered consent and who it belongs to', () => {
    const { result } = renderHook(() => useCookieConsent(), {
      wrapper: wrapper(true),
    })

    expect(result.current.consent).toBe('rejected')
    expect(result.current.isAuthenticated).toBe(true)
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
