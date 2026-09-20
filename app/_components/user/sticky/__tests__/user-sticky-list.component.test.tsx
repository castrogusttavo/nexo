import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StickyNoteDTO } from '@/types/sticky-note'
import { UserStickyList } from '../user-sticky-list'

// The sticky card mounts a TipTap editor and has a suite of its own; the
// list only has to hand each note to it.
vi.mock('@/app/_components/user/sticky/user-sticky', () => ({
  UserStick: ({ sticky }: { sticky: StickyNoteDTO }) => (
    <article aria-label={`Sticky ${sticky.id}`}>{sticky.color}</article>
  ),
}))

function buildSticky(overrides: Partial<StickyNoteDTO> = {}): StickyNoteDTO {
  return {
    id: 'sticky-1',
    content: { type: 'doc', content: [] },
    color: 'YELLOW',
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('<UserStickyList />', () => {
  it('shows placeholders while the notes are loading', () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { container } = renderWithProviders(<UserStickyList />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    deferred.resolve(apiSuccess([]))
  })

  it('reads the notes and renders one card per note', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess([
        buildSticky(),
        buildSticky({ id: 'sticky-2', color: 'BLUE' }),
      ]),
    )
    renderWithProviders(<UserStickyList />)

    expect(
      await screen.findByRole('article', { name: 'Sticky sticky-1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('article', { name: 'Sticky sticky-2' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe('/api/sticky-notes')
  })

  it('invites the user to write one when there is no note yet', async () => {
    mockFetch().mockResolvedValue(apiSuccess([]))
    renderWithProviders(<UserStickyList />)

    expect(
      await screen.findByText('Nenhuma anotação ainda.'),
    ).toBeInTheDocument()
  })

  it('reports a failed load instead of an empty list', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro interno'))
    renderWithProviders(<UserStickyList />)

    expect(
      await screen.findByText('Não foi possível carregar suas anotações.'),
    ).toBeInTheDocument()
  })
})
