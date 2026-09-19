import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { IssueFilterDropdown } from '../issue-filter'

describe('<IssueFilterDropdown />', () => {
  it('names the icon-only trigger, then shows the picked field', async () => {
    const { user } = renderWithProviders(<IssueFilterDropdown />)

    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(await screen.findByRole('option', { name: 'Prioridade' }))

    expect(
      screen.getByRole('button', { name: 'Prioridade' }),
    ).toBeInTheDocument()
  })

  it('clears the picked field when it is picked again', async () => {
    const { user } = renderWithProviders(<IssueFilterDropdown />)

    await user.click(screen.getByRole('button', { name: 'Filtrar' }))
    await user.click(await screen.findByRole('option', { name: 'Prioridade' }))
    await user.click(screen.getByRole('button', { name: 'Prioridade' }))
    await user.click(await screen.findByRole('option', { name: 'Prioridade' }))

    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
  })
})
