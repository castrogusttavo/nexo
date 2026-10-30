import { Building02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPlaceholderPage } from '../settings-placeholder-page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/acme/settings/imports',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

describe('<SettingsPlaceholderPage />', () => {
  it('titles the section and says it is coming soon', () => {
    render(
      <SettingsPlaceholderPage title='Importações' icon={Building02Icon} />,
    )

    expect(screen.getAllByText('Importações').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('Esta seção estará disponível em breve.'),
    ).toBeInTheDocument()
  })

  it('renders the title as the page heading', () => {
    render(<SettingsPlaceholderPage title='Webhooks' icon={Building02Icon} />)

    expect(
      screen.getByRole('heading', { name: 'Webhooks' }),
    ).toBeInTheDocument()
  })
})
