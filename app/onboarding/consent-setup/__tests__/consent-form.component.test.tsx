import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ConsentForm } from '../consent-form'

const { acceptOnboardingConsent } = vi.hoisted(() => ({
  acceptOnboardingConsent: vi.fn(),
}))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ acceptOnboardingConsent }))

const termsCheckbox = () =>
  screen.getByRole('checkbox', { name: /termos de serviço/i })
const privacyCheckbox = () =>
  screen.getByRole('checkbox', { name: /política de privacidade/i })
const submitButton = () => screen.getByRole('button', { name: 'Continuar' })

beforeEach(() => {
  acceptOnboardingConsent.mockResolvedValue({ ok: true })
})

describe('<ConsentForm />', () => {
  it('requires both documents to be accepted before continuing', async () => {
    const { user } = renderWithProviders(<ConsentForm />)

    expect(submitButton()).toBeDisabled()
    await user.click(termsCheckbox())
    expect(submitButton()).toBeDisabled()
    await user.click(privacyCheckbox())
    expect(submitButton()).toBeEnabled()
  })

  it('disables continue again when a box is unchecked', async () => {
    const { user } = renderWithProviders(<ConsentForm />)

    await user.click(termsCheckbox())
    await user.click(privacyCheckbox())
    await user.click(termsCheckbox())

    expect(submitButton()).toBeDisabled()
  })

  it('submits both acceptances to the server action', async () => {
    const { user } = renderWithProviders(<ConsentForm />)

    await user.click(termsCheckbox())
    await user.click(privacyCheckbox())
    await user.click(submitButton())

    await waitFor(() => expect(acceptOnboardingConsent).toHaveBeenCalled())
    const formData: FormData = acceptOnboardingConsent.mock.calls[0]?.[1]
    expect(formData.get('acceptedTerms')).toBe('on')
    expect(formData.get('acceptedPrivacy')).toBe('on')
  })

  it('locks the form while saving', async () => {
    let resolve!: (value: unknown) => void
    acceptOnboardingConsent.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<ConsentForm />)

    await user.click(termsCheckbox())
    await user.click(privacyCheckbox())
    await user.click(submitButton())

    expect(
      await screen.findByRole('button', { name: 'Salvando...' }),
    ).toBeDisabled()
    expect(termsCheckbox()).toHaveAttribute('aria-disabled', 'true')

    resolve({ ok: false })
    expect(
      await screen.findByRole('button', { name: 'Continuar' }),
    ).toBeEnabled()
  })

  it('shows the error returned by the action', async () => {
    acceptOnboardingConsent.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar seu consentimento. Tente novamente',
    })
    const { user } = renderWithProviders(<ConsentForm />)

    await user.click(termsCheckbox())
    await user.click(privacyCheckbox())
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar seu consentimento. Tente novamente',
    )
  })
})
