import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import type { IssuePriorityDTO } from '@/types/issue'
import { PriorityPicker } from '../priority-picker'

function renderPicker(value: IssuePriorityDTO | undefined) {
  const onChange = vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <PriorityPicker value={value} onChange={onChange} />,
    ),
  }
}

describe('<PriorityPicker />', () => {
  it('prompts for a priority when none is set', () => {
    renderPicker(undefined)

    expect(
      screen.getByRole('button', { name: 'Prioridade' }),
    ).toBeInTheDocument()
  })

  it('labels the trigger with the current priority and reports a new one', async () => {
    const { user, onChange } = renderPicker('LOW')

    await user.click(screen.getByRole('button', { name: 'Baixa' }))
    await user.click(await screen.findByRole('option', { name: 'Urgente' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('URGENT')
  })
})
