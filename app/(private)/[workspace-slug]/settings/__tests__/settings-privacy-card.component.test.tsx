import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CookieConsentProvider } from '@/app/_components/user/cookie-consent/provider'
import type { CookieConsent } from '@/lib/cookie-consent/types'
import {
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { SettingsPrivacyCard } from '../settings-privacy-card'

const ACCEPTED_AT = '2026-02-10T12:00:00.000Z'

function renderCard({
  consent = null as CookieConsent,
  isAuthenticated = true,
  acceptedTermsAt = null as string | null,
  acceptedPrivacyAt = null as string | null,
} = {}) {
  return renderWithProviders(
    <CookieConsentProvider initial={consent} isAuthenticated={isAuthenticated}>
      <SettingsPrivacyCard
        acceptedTermsAt={acceptedTermsAt}
        acceptedPrivacyAt={acceptedPrivacyAt}
      />
    </CookieConsentProvider>,
  )
}

const toggle = () => screen.getByRole('switch')

describe('<SettingsPrivacyCard /> cookie consent', () => {
  it('says the choice is still open when nothing was decided', () => {
    renderCard()

    expect(
      screen.getByText(
        'Você ainda não decidiu sobre o uso de cookies de análise.',
      ),
    ).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
  })

  it('reflects an accepted consent', () => {
    renderCard({ consent: 'accepted' })

    expect(
      screen.getByText('Aceitos. Você pode revogar a qualquer momento.'),
    ).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
  })

  it('reflects a rejected consent', () => {
    renderCard({ consent: 'rejected' })

    expect(
      screen.getByText('Recusados. Nenhum tracker de análise é carregado.'),
    ).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
  })

  it('accepts the cookies and records the choice for the account', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    const { user } = renderCard()

    await user.click(toggle())

    await waitFor(() =>
      expect(toggle()).toHaveAttribute('aria-checked', 'true'),
    )
    expect(
      screen.getByText('Aceitos. Você pode revogar a qualquer momento.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me/cookie-consent',
      method: 'POST',
      body: { accepted: true },
    })
  })

  it('revokes the consent that was given', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    const { user } = renderCard({ consent: 'accepted' })

    await user.click(toggle())

    await waitFor(() =>
      expect(toggle()).toHaveAttribute('aria-checked', 'false'),
    )
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({ accepted: false })
  })
})

describe('<SettingsPrivacyCard /> legal acceptance', () => {
  it('shows both acceptances as pending when there is no timestamp', () => {
    renderCard()

    expect(screen.getAllByText('Pendente de aceite')).toHaveLength(2)
    expect(
      screen.getByText(/Para revogar o aceite dos Termos/),
    ).toBeInTheDocument()
  })

  it('formats each acceptance date for pt-BR', () => {
    renderCard({ acceptedTermsAt: ACCEPTED_AT, acceptedPrivacyAt: ACCEPTED_AT })

    const date = new Date(ACCEPTED_AT).toLocaleDateString('pt-BR')
    expect(screen.getByText(`Aceito em ${date}`)).toBeInTheDocument()
    expect(screen.getByText(`Aceita em ${date}`)).toBeInTheDocument()
    expect(screen.queryByText('Pendente de aceite')).not.toBeInTheDocument()
  })
})
