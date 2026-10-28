import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { Combobox } from '../combobox'

const OPTIONS = [
  { id: 'todo', name: 'A fazer' },
  { id: 'done', name: 'Concluído' },
]

function renderCombobox(
  props: { value?: string; onChange?: (value: string) => void } = {},
) {
  const onChange = props.onChange ?? vi.fn()
  const result = renderWithProviders(
    <Combobox
      options={OPTIONS}
      getValue={(option) => option.id}
      getSearchText={(option) => option.name}
      renderItem={(option) => option.name}
      value={props.value}
      onChange={onChange}
      trigger={<button type='button'>Abrir</button>}
    />,
  )
  return { ...result, onChange }
}

async function pick(
  user: ReturnType<typeof renderCombobox>['user'],
  name: string,
) {
  await user.click(screen.getByRole('button', { name: 'Abrir' }))
  await user.click(await screen.findByRole('option', { name }))
}

describe('<Combobox /> single value', () => {
  it('reports the picked option', async () => {
    const { user, onChange } = renderCombobox({ value: 'todo' })

    await pick(user, 'Concluído')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('done')
  })

  it('treats re-picking the current option as a no-op and closes', async () => {
    const { user, onChange } = renderCombobox({ value: 'todo' })

    await pick(user, 'A fazer')

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})

describe('<Combobox /> multiple values', () => {
  it('toggles an option in and out of the selection', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <Combobox
        multiple
        options={OPTIONS}
        getValue={(option) => option.id}
        getSearchText={(option) => option.name}
        renderItem={(option) => option.name}
        value={['todo']}
        onChange={onChange}
        trigger={<button type='button'>Abrir</button>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(await screen.findByRole('option', { name: 'A fazer' }))
    await user.click(screen.getByRole('option', { name: 'Concluído' }))

    expect(onChange).toHaveBeenNthCalledWith(1, [])
    expect(onChange).toHaveBeenNthCalledWith(2, ['todo', 'done'])
  })
})
