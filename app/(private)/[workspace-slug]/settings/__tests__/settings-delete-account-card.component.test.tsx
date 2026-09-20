import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { SettingsDeleteAccountCard } from '../settings-delete-account-card'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { signOut },
}))

const SCHEDULED_AT = '2026-05-20T15:30:00.000Z'

const originalLocation = window.location

/**
 * jsdom refuses real navigation, so `window.location` is swapped for an
 * object whose `href` setter is a spy.
 */
function stubLocation() {
  const setHref = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      get href() {
        return 'http://localhost/settings'
      },
      set href(value: string) {
        setHref(value)
      },
    },
  })
  return setHref
}

function renderCard(deletionScheduledAt: string | null = null) {
  const onCancelled = vi.fn()
  return {
    onCancelled,
    ...renderWithProviders(
      <SettingsDeleteAccountCard
        deletionScheduledAt={deletionScheduledAt}
        onCancelled={onCancelled}
      />,
    ),
  }
}

const deleteButton = () => screen.getByRole('button', { name: 'Excluir conta' })
const confirmButton = () =>
  screen.getByRole('button', { name: 'Confirmar exclusão' })

beforeEach(() => {
  signOut.mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
})

describe('<SettingsDeleteAccountCard /> without a scheduled deletion', () => {
  it('explains the consequences and offers the destructive action', () => {
    renderCard()

    expect(
      screen.getByText(/A conta será agendada para exclusão/),
    ).toBeInTheDocument()
    expect(deleteButton()).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Confirmar exclusão' }),
    ).not.toBeInTheDocument()
  })

  it('asks for confirmation before calling the API', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderCard()

    await user.click(deleteButton())

    expect(confirmButton()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('goes back to the idle state on cancel', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.queryByRole('button', { name: 'Confirmar exclusão' }),
    ).not.toBeInTheDocument()
    expect(deleteButton()).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('schedules the deletion, signs out and lands on the home page', async () => {
    const setHref = stubLocation()
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/users/me')
    expect(method).toBe('DELETE')
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(setHref).toHaveBeenCalledWith('/'))
  })

  it('disables both buttons while the request is in flight', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    const pending = await screen.findByRole('button', { name: 'Agendando...' })
    expect(pending).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })

  it('keeps the confirmation open and shows the API message on failure', async () => {
    // The API envelope carries the human message at the top level; `error`
    // only holds the machine-readable code.
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Assinatura ativa impede a exclusão', 'CONFLICT'),
    )
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    expect(
      await screen.findByText('Assinatura ativa impede a exclusão'),
    ).toBeInTheDocument()
    expect(confirmButton()).toBeEnabled()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    mockFetch().mockResolvedValueOnce(
      new Response('<html>oops</html>', { status: 500 }),
    )
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    expect(
      await screen.findByText('Não foi possível agendar a exclusão'),
    ).toBeInTheDocument()
  })

  it('shows the thrown message when the request itself fails', async () => {
    mockFetch().mockRejectedValueOnce(new Error('Failed to fetch'))
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument()
    expect(confirmButton()).toBeEnabled()
  })

  it('shows a network fallback when the rejection is not an Error', async () => {
    mockFetch().mockRejectedValueOnce('boom')
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())

    expect(await screen.findByText('Erro de rede')).toBeInTheDocument()
  })

  it('clears the error when the confirmation is dismissed', async () => {
    mockFetch().mockRejectedValueOnce(new Error('Failed to fetch'))
    const { user } = renderCard()

    await user.click(deleteButton())
    await user.click(confirmButton())
    await screen.findByText('Failed to fetch')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  })
})

describe('<SettingsDeleteAccountCard /> with a scheduled deletion', () => {
  const cancelButton = () =>
    screen.getByRole('button', { name: 'Cancelar exclusão' })

  it('shows the scheduled date formatted for pt-BR', () => {
    renderCard(SCHEDULED_AT)

    expect(screen.getByText(/Exclusão agendada para/)).toHaveTextContent(
      new Date(SCHEDULED_AT).toLocaleString('pt-BR'),
    )
    expect(
      screen.queryByRole('button', { name: 'Excluir conta' }),
    ).not.toBeInTheDocument()
  })

  it('cancels the scheduled deletion and notifies the parent', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { user, onCancelled } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/users/me/deletion')
    expect(method).toBe('DELETE')
    await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(cancelButton()).toBeEnabled())
  })

  it('disables the button while cancelling', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    const pending = await screen.findByRole('button', { name: 'Cancelando...' })
    expect(pending).toBeDisabled()
  })

  it('shows the API message when cancelling fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Prazo de cancelamento expirado', 'CONFLICT'),
    )
    const { user, onCancelled } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    expect(
      await screen.findByText('Prazo de cancelamento expirado'),
    ).toBeInTheDocument()
    expect(onCancelled).not.toHaveBeenCalled()
    await waitFor(() => expect(cancelButton()).toBeEnabled())
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    mockFetch().mockResolvedValueOnce(new Response('nope', { status: 500 }))
    const { user } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    expect(
      await screen.findByText('Não foi possível cancelar a exclusão'),
    ).toBeInTheDocument()
  })

  it('shows the thrown message when the request itself fails', async () => {
    mockFetch().mockRejectedValueOnce(new Error('Failed to fetch'))
    const { user } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument()
  })

  it('shows a network fallback when the rejection is not an Error', async () => {
    mockFetch().mockRejectedValueOnce('boom')
    const { user } = renderCard(SCHEDULED_AT)

    await user.click(cancelButton())

    expect(await screen.findByText('Erro de rede')).toBeInTheDocument()
  })
})
