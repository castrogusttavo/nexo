import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { HeaderBreadcrumbCrumb, HeaderBreadcrumbList } from '..'

// jsdom has no layout, so the narrow-screen behaviour itself is proven by the
// mobile baselines of e2e/visual/workspace.spec.ts. This pins the contract
// those pictures depend on, so a refactor cannot quietly undo it.
function renderBreadcrumb(title = 'Página inicial') {
  return renderWithProviders(
    <HeaderBreadcrumbList>
      <HeaderBreadcrumbCrumb title={title}>
        <svg aria-hidden='true' />
      </HeaderBreadcrumbCrumb>
    </HeaderBreadcrumbList>,
  )
}

describe('<HeaderBreadcrumbList />', () => {
  it('may shrink below its content and never wraps its crumbs', () => {
    renderBreadcrumb()

    const nav = screen.getByRole('navigation', { name: 'breadcrumb' })
    expect(nav).toHaveClass('min-w-0')
    const list = screen.getByRole('list')
    expect(list).toHaveClass('flex-nowrap', 'overflow-hidden')
    expect(list).not.toHaveClass('flex-wrap')
  })
})

describe('<HeaderBreadcrumbCrumb />', () => {
  it('truncates the title on one line instead of wrapping it', () => {
    renderBreadcrumb()

    const title = screen.getByText('Página inicial')
    expect(title).toHaveClass('truncate')
    expect(screen.getByRole('listitem')).toHaveClass('min-w-0')
  })

  it('still offers the full title in a tooltip', async () => {
    const { user } = renderBreadcrumb()

    await user.hover(screen.getByRole('listitem'))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Página inicial',
    )
  })

  it('renders no title element when the crumb has none', () => {
    renderWithProviders(
      <HeaderBreadcrumbList>
        <HeaderBreadcrumbCrumb>
          <button type='button'>Plataforma</button>
        </HeaderBreadcrumbCrumb>
      </HeaderBreadcrumbList>,
    )

    expect(screen.getByRole('listitem')).toHaveTextContent(/^Plataforma$/)
    expect(screen.getByRole('listitem').querySelector('.truncate')).toBeNull()
  })
})
