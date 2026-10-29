import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import {
  ContextSidebar,
  ContextSidebarCollapseButton,
  ContextSidebarExpandButton,
  ContextSidebarSection,
} from '..'
import {
  CONTEXT_SIDEBAR_INIT_SCRIPT,
  CONTEXT_SIDEBAR_STYLE,
  contextSidebarStorageKey,
} from '../context-sidebar-sections'
import { setContextSidebarOpen } from '../use-context-sidebar'

const html = document.documentElement
const KEY = contextSidebarStorageKey('projects')

afterEach(() => {
  vi.restoreAllMocks()
  html.removeAttribute('data-sidebar-projects')
  html.removeAttribute('data-sidebar-wiki')
  document.getElementById('context-sidebar-style')?.remove()
})

// What a collapsible section's layout and page put on screen: the header's
// expand button and the sidebar with its collapse button.
function Shell() {
  return (
    <ContextSidebarSection id='projects'>
      <ContextSidebarExpandButton />
      <ContextSidebar section='projects'>
        <ContextSidebarCollapseButton />
      </ContextSidebar>
    </ContextSidebarSection>
  )
}

const collapse = () =>
  screen.getByRole('button', { name: 'Recolher barra lateral' })
const expand = () =>
  screen.getByRole('button', { name: 'Expandir barra lateral' })

describe('context sidebar state', () => {
  it('starts open when nothing was saved', () => {
    renderWithProviders(<Shell />)

    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('collapses, remembers it and marks the page for the CSS', async () => {
    const { user } = renderWithProviders(<Shell />)

    await user.click(collapse())

    expect(localStorage.getItem(KEY)).toBe('closed')
    expect(html).toHaveAttribute('data-sidebar-projects', 'closed')
  })

  it('opens again from the header button', async () => {
    localStorage.setItem(KEY, 'closed')
    html.setAttribute('data-sidebar-projects', 'closed')
    const { user } = renderWithProviders(<Shell />)

    await user.click(expand())

    expect(localStorage.getItem(KEY)).toBe('open')
    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('keeps each section to itself', () => {
    setContextSidebarOpen('wiki' as never, false)

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(html).toHaveAttribute('data-sidebar-wiki', 'closed')
    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('follows a collapse made in another tab, and a cleared storage', () => {
    renderWithProviders(<Shell />)

    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: 'closed' }),
    )
    expect(html).toHaveAttribute('data-sidebar-projects', 'closed')

    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('ignores other tabs once the section is gone', () => {
    const { unmount } = renderWithProviders(<Shell />)
    unmount()

    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: 'closed' }),
    )

    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('still collapses for this tab when storage refuses the write', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { user } = renderWithProviders(<Shell />)

    await user.click(collapse())

    expect(html).toHaveAttribute('data-sidebar-projects', 'closed')
  })

  it('points both buttons at the sidebar they drive', () => {
    renderWithProviders(<Shell />)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveAttribute('id', 'context-sidebar-projects')
    expect(sidebar).toHaveAttribute('data-context-sidebar', 'projects')
    expect(collapse()).toHaveAttribute(
      'aria-controls',
      'context-sidebar-projects',
    )
    expect(expand()).toHaveAttribute(
      'aria-controls',
      'context-sidebar-projects',
    )
  })

  it('offers neither button outside a collapsible section', () => {
    renderWithProviders(
      <ContextSidebar>
        <ContextSidebarCollapseButton />
        <ContextSidebarExpandButton />
      </ContextSidebar>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('complementary')).not.toHaveAttribute('id')
  })
})

describe('context sidebar before hydration', () => {
  it('marks a section saved as collapsed on <html>', () => {
    localStorage.setItem(KEY, 'closed')

    new Function(CONTEXT_SIDEBAR_INIT_SCRIPT)()

    expect(html).toHaveAttribute('data-sidebar-projects', 'closed')
  })

  it('leaves an open section unmarked', () => {
    localStorage.setItem(KEY, 'open')

    new Function(CONTEXT_SIDEBAR_INIT_SCRIPT)()

    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('reads an unknown saved value as open', () => {
    localStorage.setItem(KEY, 'banana')

    new Function(CONTEXT_SIDEBAR_INIT_SCRIPT)()

    expect(html).not.toHaveAttribute('data-sidebar-projects')
  })

  it('hides the sidebar and shows the expand button from that mark alone', () => {
    const style = document.createElement('style')
    style.id = 'context-sidebar-style'
    style.textContent = CONTEXT_SIDEBAR_STYLE
    document.head.append(style)
    renderWithProviders(<Shell />)
    // By the attribute the CSS keys on: a display:none element has no
    // accessible name, so a role + name query cannot reach it while hidden.
    const expandButton = document.querySelector(
      '[data-context-sidebar-expand="projects"]',
    )

    expect(screen.getByRole('complementary')).toBeVisible()
    expect(expandButton).not.toBeVisible()

    html.setAttribute('data-sidebar-projects', 'closed')

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(expandButton).toBeVisible()
  })
})
