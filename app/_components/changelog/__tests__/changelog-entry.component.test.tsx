import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import type { ChangelogEntryDTO } from '@/types/changelog-entry'
import { ChangelogEntry, ChangelogEntryBody } from '../changelog-entry'

const ENTRY: ChangelogEntryDTO = {
  slug: 'barra-lateral-recolhivel',
  title: 'Barra lateral recolhível',
  date: '2026-10-29T00:00:00.000Z',
  summary: 'Resumo da entrada.',
  improvements: ['Menu Exibir com nomes acessíveis'],
  fixes: ['Nome do perfil em branco sobre a capa'],
  contentHtml: '<h3>Recolha a barra lateral</h3><p>Texto do destaque.</p>',
  markdown: '# Barra lateral recolhível',
}

describe('<ChangelogEntry />', () => {
  it('links the title to the entry page on the list', () => {
    renderWithProviders(<ChangelogEntry entry={ENTRY} />)

    const heading = screen.getByRole('heading', { level: 2, name: ENTRY.title })
    expect(screen.getByRole('link', { name: ENTRY.title })).toHaveAttribute(
      'href',
      '/changelog/barra-lateral-recolhivel',
    )
    expect(heading).toContainElement(
      screen.getByRole('link', { name: ENTRY.title }),
    )
  })

  it('shows the date as a machine-readable time', () => {
    renderWithProviders(<ChangelogEntry entry={ENTRY} />)

    for (const time of document.querySelectorAll('time')) {
      expect(time).toHaveAttribute('dateTime', ENTRY.date)
      expect(time).toHaveTextContent('29 Out, 2026')
    }
  })

  it('tags and renders the news from the Markdown body', () => {
    renderWithProviders(<ChangelogEntry entry={ENTRY} />)

    expect(screen.getByText('Novidades')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Recolha a barra lateral',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Texto do destaque.')).toBeInTheDocument()
  })

  it('lists improvements and fixes, collapsed until opened', async () => {
    const { user } = renderWithProviders(<ChangelogEntry entry={ENTRY} />)
    const improvements = screen.getByRole('button', { name: 'Melhorias' })
    expect(improvements).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Correções' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await user.click(improvements)

    expect(improvements).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Menu Exibir com nomes acessíveis')).toBeVisible()
  })

  it('leaves out every part the entry does not have', () => {
    renderWithProviders(
      <ChangelogEntry
        entry={{ ...ENTRY, contentHtml: '', improvements: [], fixes: [] }}
      />,
    )

    expect(screen.queryByText('Novidades')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the same body on its own, for the entry page', () => {
    renderWithProviders(<ChangelogEntryBody entry={ENTRY} />)

    expect(screen.getByText('Novidades')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Melhorias' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
