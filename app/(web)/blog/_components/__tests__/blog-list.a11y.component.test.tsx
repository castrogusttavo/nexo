import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import type { BlogPostMetaDTO } from '@/types/blog-post'
import { BlogList } from '../blog-list'

// 8 per page: 20 posts make three pages.
const POSTS: BlogPostMetaDTO[] = Array.from({ length: 20 }, (_, i) => ({
  slug: `post-${i + 1}`,
  title: `Post ${i + 1}`,
  date: '2026-01-01T00:00:00.000Z',
  excerpt: '',
  cover: '/cover.png',
  tag: 'TECNOLOGIA',
}))

function renderList() {
  const utils = renderWithProviders(<BlogList posts={POSTS} />)
  const nav = screen.getByRole('navigation', { name: 'Paginação' })
  return { ...utils, nav, pages: within(nav) }
}

describe('<BlogList /> pagination', () => {
  it('has no axe violations', async () => {
    const { nav } = renderList()

    await expectNoA11yViolations(nav, { disabledRules: ['region'] })
  })

  // The page lives in component state, not in the url: there is nowhere to
  // navigate to, so each control is an action — a real <button>, not an
  // anchor wearing role="button".
  it('renders its controls as real buttons, not links', () => {
    const { pages } = renderList()

    expect(pages.queryAllByRole('link')).toHaveLength(0)
    const buttons = pages.getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Anterior',
      '1',
      '2',
      '3',
      'Próxima',
    ])
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON')
      expect(button).not.toHaveAttribute('role')
      expect(button).not.toHaveAttribute('href')
    }
  })

  it('marks the page on screen with aria-current', async () => {
    const { pages, user } = renderList()

    expect(pages.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(pages.getByRole('button', { name: '2' }))

    expect(pages.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(pages.getByRole('button', { name: '1' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByText('Post 9')).toBeInTheDocument()
  })

  it('cannot step past the first or the last page', async () => {
    const { pages, user } = renderList()
    const previous = pages.getByRole('button', {
      name: 'Ir para a página anterior',
    })
    const next = pages.getByRole('button', { name: 'Ir para a próxima página' })

    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    await user.click(next)
    await user.click(next)

    expect(next).toBeDisabled()
    expect(previous).toBeEnabled()
    expect(screen.getByText('Post 17')).toBeInTheDocument()
  })
})
