import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { ApiError } from '@/src/hooks/_fetch'
import { UserStickyCreateButton } from '../user-sticky-create-button'

// Real sonner attaches its own handlers to the tracked promise; the stub
// does the same so a rejected mutation never surfaces as an unhandled
// rejection in the test run.
vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

describe('<UserStickyCreateButton />', () => {
  it('uses the default label', () => {
    renderWithProviders(<UserStickyCreateButton />)

    expect(
      screen.getByRole('button', { name: 'Adicionar sticky' }),
    ).toBeEnabled()
  })

  it('accepts a caller-supplied label', () => {
    renderWithProviders(<UserStickyCreateButton label='Nova anotação' />)

    expect(
      screen.getByRole('button', { name: 'Nova anotação' }),
    ).toBeInTheDocument()
  })

  it('posts an empty sticky note and announces the progress', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ id: 'sticky-1' }),
    )
    const { user } = renderWithProviders(<UserStickyCreateButton />)

    await user.click(screen.getByRole('button', { name: 'Adicionar sticky' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/sticky-notes',
      method: 'POST',
      body: {},
    })
    expect(toast.promise).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loading: 'Criando sticky...',
        success: 'Sticky criado',
      }),
    )
  })

  it('blocks a second click while the first note is still being created', async () => {
    const deferred = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(deferred.promise)
    const { user } = renderWithProviders(<UserStickyCreateButton />)

    await user.click(screen.getByRole('button', { name: 'Adicionar sticky' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Adicionar sticky' }),
      ).toBeDisabled(),
    )

    deferred.resolve(apiSuccess({ id: 'sticky-1' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Adicionar sticky' }),
      ).toBeEnabled(),
    )
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('surfaces the server message and re-enables the button when creation fails', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Limite de stickies atingido'))
    const { user } = renderWithProviders(<UserStickyCreateButton />)

    await user.click(screen.getByRole('button', { name: 'Adicionar sticky' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Adicionar sticky' }),
      ).toBeEnabled(),
    )
    // `notify.mutate` hands sonner a resolver that prefers the API message
    // over the generic fallback.
    const messages = vi.mocked(toast.promise).mock.calls[0]?.[1] as {
      error: (error: unknown) => string
    }
    expect(messages.error(new ApiError('Limite de stickies atingido'))).toBe(
      'Limite de stickies atingido',
    )
    expect(messages.error(new TypeError('network'))).toBe(
      'Erro ao criar sticky',
    )
  })
})
