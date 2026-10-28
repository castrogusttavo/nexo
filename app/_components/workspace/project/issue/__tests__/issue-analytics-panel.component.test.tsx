import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { IssueAnalyticsPanel } from '../issue-analytics-panel'

const desktopWidth = window.innerWidth

afterEach(() => {
  window.innerWidth = desktopWidth
})

async function openPanel() {
  const result = renderWithProviders(<IssueAnalyticsPanel />)
  await result.user.click(screen.getByRole('button', { name: 'Análises' }))
  return screen.findByRole('dialog')
}

describe('<IssueAnalyticsPanel />', () => {
  it('slides in from the right on a wide screen', async () => {
    window.innerWidth = 1280

    const dialog = await openPanel()

    expect(
      screen.getByRole('heading', { name: 'Análise do Nome qualquer' }),
    ).toBeInTheDocument()
    expect(dialog).toHaveAttribute('data-swipe-axis', 'x')
  })

  it('rises from the bottom on a phone', async () => {
    window.innerWidth = 390

    const dialog = await openPanel()

    expect(dialog).toHaveAttribute('data-swipe-axis', 'y')
  })
})
