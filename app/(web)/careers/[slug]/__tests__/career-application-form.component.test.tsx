import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { ApiError } from '@/src/hooks/_fetch'
import { CareerApplicationForm } from '../career-application-form'

const { notifyError, logError } = vi.hoisted(() => ({
  notifyError: vi.fn(),
  logError: vi.fn(),
}))
vi.mock('@/lib/notify', () => ({ notify: { error: notifyError } }))
vi.mock('@/lib/axiom/client', () => ({
  useLogger: () => ({ error: logError }),
}))

const RESUME = new File(['%PDF-1.4'], 'curriculo.pdf', {
  type: 'application/pdf',
})

beforeEach(() => {
  notifyError.mockReset()
  logError.mockReset()
})

async function fillForm({ consent = true } = {}) {
  const utils = renderWithProviders(<CareerApplicationForm slug='engenharia' />)
  const { user } = utils
  await user.type(screen.getByLabelText(/Nome/), 'Ana Souza')
  await user.type(screen.getByLabelText(/E-mail/), 'ana@nexo.dev')
  await user.upload(screen.getByLabelText(/Currículo/), RESUME)
  if (consent) await user.click(screen.getByRole('checkbox'))
  return utils
}

const submit = () => screen.getByRole('button', { name: 'Enviar candidatura' })

// jsdom keeps a required <input type="file"> invalid even after
// user.upload sets its files, so clicking submit never fires the event.
// Browsers do; submit the form directly.
function submitForm() {
  fireEvent.submit(submit().closest('form') as HTMLFormElement)
}

describe('<CareerApplicationForm />', () => {
  it('sends the application and confirms it', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ received: true }, 201),
    )
    await fillForm()

    submitForm()

    expect(
      await screen.findByText('Candidatura recebida 🎉'),
    ).toBeInTheDocument()
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/careers/engenharia/apply')
    expect(method).toBe('POST')
    // jsdom leaves the uploaded file out of new FormData(form); the
    // text fields and the consent flag are what it can check.
    expect((body as FormData).get('name')).toBe('Ana Souza')
    expect((body as FormData).get('email')).toBe('ana@nexo.dev')
    expect((body as FormData).get('consent')).toBe('true')
  })

  it('does not send without the LGPD consent', async () => {
    const fetchSpy = mockFetch()
    await fillForm({ consent: false })

    submitForm()

    expect(screen.getByText('Necessário para enviar')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("shows the server's own message when it refuses the application", async () => {
    mockFetch().mockResolvedValueOnce(apiError(400, 'Envie o currículo em PDF'))
    await fillForm()

    submitForm()

    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1))
    const [error] = notifyError.mock.calls[0] ?? []
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Envie o currículo em PDF')
    expect(logError).not.toHaveBeenCalled()
    expect(submit()).toBeEnabled()
  })

  it('logs a network failure and asks to try again', async () => {
    mockFetch().mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await fillForm()

    submitForm()

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'Não foi possível enviar. Tente novamente.',
      ),
    )
    expect(logError).toHaveBeenCalledWith(
      'career_application.submit_failed',
      expect.objectContaining({ message: 'Failed to fetch' }),
    )
  })
})
