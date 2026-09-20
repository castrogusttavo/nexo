import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ShortLinkDTO } from '@/types/short-link'
import { UserShortcutLinkList } from '../user-shortcut-link-list'

function buildLink(overrides: Partial<ShortLinkDTO> = {}): ShortLinkDTO {
  return {
    id: 'link-1',
    title: 'Documentação',
    url: 'https://nexo.dev/docs',
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('<UserShortcutLinkList />', () => {
  it('shows placeholders while the links are loading', () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    const { container } = renderWithProviders(<UserShortcutLinkList />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5)
    deferred.resolve(apiSuccess([]))
  })

  it('reads the links and renders one entry per link', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess([
        buildLink(),
        buildLink({
          id: 'link-2',
          title: 'Blog',
          url: 'https://nexo.dev/blog',
        }),
      ]),
    )
    renderWithProviders(<UserShortcutLinkList />)

    expect(
      await screen.findByRole('link', { name: /Documentação/ }),
    ).toHaveAttribute('href', 'https://nexo.dev/docs')
    expect(screen.getByRole('link', { name: /Blog/ })).toHaveAttribute(
      'href',
      'https://nexo.dev/blog',
    )
    expect(getFetchCall(fetchSpy).url).toBe('/api/short-links')
  })

  it('invites the user to add one when there is no link yet', async () => {
    mockFetch().mockResolvedValue(apiSuccess([]))
    renderWithProviders(<UserShortcutLinkList />)

    expect(
      await screen.findByText('Nenhum link rápido ainda.'),
    ).toBeInTheDocument()
  })

  it('reports a failed load instead of an empty list', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Erro interno'))
    renderWithProviders(<UserShortcutLinkList />)

    expect(
      await screen.findByText('Não foi possível carregar os links rápidos.'),
    ).toBeInTheDocument()
  })
})
