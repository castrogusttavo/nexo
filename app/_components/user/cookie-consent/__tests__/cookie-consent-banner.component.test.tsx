import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import {
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { CookieConsentBanner } from '../cookie-consent-banner'
import { CookieConsentProvider } from '../cookie-consent-provider'

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: null }) },
}))

const CONSENT_URL = '/api/users/me/cookie-consent'

function renderBanner(initial: CookieConsent, isAuthenticated = true) {
  return renderWithProviders(
    <CookieConsentProvider initial={initial} isAuthenticated={isAuthenticated}>
      <CookieConsentBanner />
    </CookieConsentProvider>,
  )
}

const banner = () => screen.queryByRole('region', { name: 'Aviso de cookies' })

describe('<CookieConsentBanner />', () => {
  it('asks for a decision while none was made', () => {
    renderBanner(null)

    expect(banner()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saiba mais' })).toHaveAttribute(
      'href',
      '/legals/privacy#cookies',
    )
  })

  it('stays out of the way once the user accepted', () => {
    renderBanner('accepted')

    expect(banner()).not.toBeInTheDocument()
  })

  it('stays out of the way once the user rejected', () => {
    renderBanner('rejected')

    expect(banner()).not.toBeInTheDocument()
  })

  it('records an acceptance, dismisses itself and audits the choice', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(new Response(null))
    const { user } = renderBanner(null)

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(banner()).not.toBeInTheDocument()
    expect(document.cookie).toContain('nx_cookie_consent=accepted')
    expect(getFetchCall(fetchSpy)).toEqual({
      url: CONSENT_URL,
      method: 'POST',
      body: { accepted: true },
    })
  })

  it('records a rejection the same way', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(new Response(null))
    const { user } = renderBanner(null)

    await user.click(screen.getByRole('button', { name: 'Rejeitar' }))

    expect(banner()).not.toBeInTheDocument()
    expect(document.cookie).toContain('nx_cookie_consent=rejected')
    expect(getFetchCall(fetchSpy).body).toEqual({ accepted: false })
  })

  it('still dismisses itself when the audit call fails', async () => {
    mockFetch().mockRejectedValue(new Error('offline'))
    const { user } = renderBanner(null)

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(banner()).not.toBeInTheDocument()
  })

  it('skips the audit call for a visitor who is not signed in', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderBanner(null, false)

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(banner()).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// The root layout hands the provider nothing: the cookie is read after mount.
describe('<CookieConsentBanner /> with the consent read in the browser', () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: test fixture for the consent cookie.
    document.cookie = 'nx_cookie_consent=; path=/; max-age=0'
  })

  it('never shows for someone who already decided', async () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test fixture for the consent cookie.
    document.cookie = 'nx_cookie_consent=accepted; path=/'
    const { container } = render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>,
    )

    // Before the effect and after it alike: no flash of the banner.
    expect(banner()).not.toBeInTheDocument()
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows once the cookie turns out to be missing', async () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>,
    )

    await waitFor(() => expect(banner()).toBeInTheDocument())
  })
})
