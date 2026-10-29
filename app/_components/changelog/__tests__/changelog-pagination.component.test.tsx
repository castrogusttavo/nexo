import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ChangelogPagination } from '../changelog-pagination'

describe('<ChangelogPagination />', () => {
  it('stays out of the way while everything fits on one page', () => {
    renderWithProviders(<ChangelogPagination page={1} totalPages={1} />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('points page 1 at /changelog and the others at /changelog/page/:n', () => {
    renderWithProviders(<ChangelogPagination page={2} totalPages={3} />)

    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute(
      'href',
      '/changelog',
    )
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/changelog/page/3',
    )
  })

  it('marks the current page', () => {
    renderWithProviders(<ChangelogPagination page={2} totalPages={3} />)

    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('offers no previous link on the first page and no next on the last', () => {
    const { unmount } = renderWithProviders(
      <ChangelogPagination page={1} totalPages={3} />,
    )
    expect(
      screen.queryByRole('link', { name: 'Ir para a página anterior' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ir para a próxima página' }),
    ).toHaveAttribute('href', '/changelog/page/2')
    unmount()

    renderWithProviders(<ChangelogPagination page={3} totalPages={3} />)
    expect(
      screen.getByRole('link', { name: 'Ir para a página anterior' }),
    ).toHaveAttribute('href', '/changelog/page/2')
    expect(
      screen.queryByRole('link', { name: 'Ir para a próxima página' }),
    ).not.toBeInTheDocument()
  })
})
