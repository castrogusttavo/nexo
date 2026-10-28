import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { ApiError } from '@/src/hooks/_fetch'
import { TalkToSalesForm } from '../talk-to-sales-form'

const { notifyError, logError, captureEvent } = vi.hoisted(() => ({
  notifyError: vi.fn(),
  logError: vi.fn(),
  captureEvent: vi.fn(),
}))
vi.mock('@/lib/notify', () => ({ notify: { error: notifyError } }))
vi.mock('@/lib/axiom/client', () => ({
  useLogger: () => ({ error: logError }),
}))
vi.mock('@/lib/posthog/client', () => ({ captureEvent }))

beforeEach(() => {
  notifyError.mockReset()
  logError.mockReset()
  captureEvent.mockReset()
})

async function fillAndSubmit() {
  const utils = renderWithProviders(<TalkToSalesForm />)
  const { user } = utils
  await user.type(screen.getByLabelText(/Seu nome/), 'Ana Souza')
  await user.type(screen.getByLabelText(/Seu e-mail/), 'ana@nexo.dev')
  await user.type(
    screen.getByLabelText('O que traz você ao Nexo?'),
    'Quero migrar o time.',
  )
  await user.click(screen.getByRole('button', { name: 'Falar com vendas' }))
  return utils
}

describe('<TalkToSalesForm />', () => {
  it('sends the contact as JSON and thanks the visitor', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ received: true }, 201),
    )

    await fillAndSubmit()

    expect(
      await screen.findByText('Recebemos seu contato 🎉'),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/talk-to-sales',
      method: 'POST',
      body: {
        name: 'Ana Souza',
        email: 'ana@nexo.dev',
        teamSize: '1-10',
        message: 'Quero migrar o time.',
      },
    })
    expect(captureEvent).toHaveBeenCalledWith('talk_to_sales_submit', {
      team_size: '1-10',
    })
  })

  it("shows the server's own message when it refuses the contact", async () => {
    mockFetch().mockResolvedValueOnce(apiError(400, 'E-mail inválido'))

    await fillAndSubmit()

    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1))
    const [error] = notifyError.mock.calls[0] ?? []
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('E-mail inválido')
    expect(logError).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Falar com vendas' }),
    ).toBeEnabled()
  })

  it('logs a network failure and asks to try again', async () => {
    mockFetch().mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await fillAndSubmit()

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'Não foi possível enviar. Tente novamente.',
      ),
    )
    expect(logError).toHaveBeenCalledWith(
      'talk_to_sales.submit_failed',
      expect.objectContaining({ message: 'Failed to fetch' }),
    )
  })
})
