import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import {
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { CookieConsentProvider } from '../../../cookie-consent/provider'
import { UserModalSecurityPrivacyField } from '../user-modal-security-privacy-field'

function renderField(initial: CookieConsent, isAuthenticated = true) {
  return renderWithProviders(
    <CookieConsentProvider initial={initial} isAuthenticated={isAuthenticated}>
      <UserModalSecurityPrivacyField />
    </CookieConsentProvider>,
  )
}

const analyticsSwitch = () =>
  screen.getByRole('switch', { name: 'Cookies de análise' })

describe('<UserModalSecurityPrivacyField />', () => {
  it('says the choice is still pending when no consent was given', () => {
    renderField(null)

    expect(analyticsSwitch()).not.toBeChecked()
    expect(
      screen.getByText(
        'Você ainda não decidiu sobre o uso de cookies de análise.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the switch on and the revocable wording once accepted', () => {
    renderField('accepted')

    expect(analyticsSwitch()).toBeChecked()
    expect(
      screen.getByText('Aceitos. Você pode revogar a qualquer momento.'),
    ).toBeInTheDocument()
  })

  it('shows the switch off and the no-tracker wording once rejected', () => {
    renderField('rejected')

    expect(analyticsSwitch()).not.toBeChecked()
    expect(
      screen.getByText('Recusados. Nenhum tracker de análise é carregado.'),
    ).toBeInTheDocument()
  })

  it('records the acceptance and audits it for a signed-in user', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(new Response(null))
    const { user } = renderField(null)

    await user.click(analyticsSwitch())

    expect(analyticsSwitch()).toBeChecked()
    expect(document.cookie).toContain('nx_cookie_consent=accepted')
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me/cookie-consent',
      method: 'POST',
      body: { accepted: true },
    })
  })

  it('records the revocation', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(new Response(null))
    const { user } = renderField('accepted')

    await user.click(analyticsSwitch())

    expect(analyticsSwitch()).not.toBeChecked()
    expect(getFetchCall(fetchSpy).body).toEqual({ accepted: false })
  })

  it('skips the audit call when nobody is signed in', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderField(null, false)

    await user.click(analyticsSwitch())

    expect(analyticsSwitch()).toBeChecked()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
