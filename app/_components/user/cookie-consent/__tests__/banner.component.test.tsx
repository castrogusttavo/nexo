import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import {
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { CookieConsentBanner } from '../banner'
import { CookieConsentProvider } from '../provider'

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
