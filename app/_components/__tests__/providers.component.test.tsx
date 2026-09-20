import { useQuery } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiSuccess, mockFetch } from '@/src/__tests__/helpers/component'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { Providers } from '../providers'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const PREFERENCES: UserPreferenceDTO = {
  theme: 'DARK',
  smoothCursor: true,
  quickSendShortcut: 'ENTER',
  timezone: 'America/Sao_Paulo',
  weekStartsOn: 0,
  weekendDays: [0, 6],
}

function Consumer() {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: async () => 'pronto',
  })
  return <span>{data ?? 'carregando'}</span>
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
  mockFetch().mockResolvedValue(apiSuccess(PREFERENCES))
  document.documentElement.classList.remove('dark')
})

describe('<Providers />', () => {
  it('renders the app below it', () => {
    render(
      <Providers>
        <p>Conteúdo</p>
      </Providers>,
    )

    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
  })

  it('gives the tree a query client', async () => {
    render(
      <Providers>
        <Consumer />
      </Providers>,
    )

    expect(screen.getByText('carregando')).toBeInTheDocument()
    expect(await screen.findByText('pronto')).toBeInTheDocument()
  })

  it('applies the stored theme through the mounted ThemeSync', async () => {
    render(
      <Providers>
        <p>Conteúdo</p>
      </Providers>,
    )

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })

  it('keeps the same query client across re-renders', async () => {
    const { rerender } = render(
      <Providers>
        <Consumer />
      </Providers>,
    )

    expect(await screen.findByText('pronto')).toBeInTheDocument()

    rerender(
      <Providers>
        <Consumer />
      </Providers>,
    )

    // A new client would drop the cache and go back to the loading branch.
    expect(screen.getByText('pronto')).toBeInTheDocument()
  })
})
