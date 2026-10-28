import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ConfirmDialog } from '../confirm-dialog'
import { Button } from '../ui/button'

function renderDialog(
  props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
) {
  const onConfirm = vi.fn()
  const utils = renderWithProviders(
    <ConfirmDialog
      trigger={<Button>Excluir</Button>}
      title='Excluir etiqueta'
      description='Essa ação não pode ser desfeita.'
      confirmLabel='Excluir'
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { ...utils, onConfirm }
}

async function open(user: ReturnType<typeof renderDialog>['user']) {
  await user.click(screen.getByRole('button', { name: 'Excluir' }))
  return screen.findByRole('alertdialog')
}

describe('<ConfirmDialog />', () => {
  it('names the dialog by its title and describes the action', async () => {
    const { user } = renderDialog()

    const dialog = await open(user)

    expect(dialog).toHaveAccessibleName('Excluir etiqueta')
    expect(dialog).toHaveAccessibleDescription(
      'Essa ação não pode ser desfeita.',
    )
  })

  it('runs the action only on confirm', async () => {
    const { user, onConfirm } = renderDialog()

    const dialog = await open(user)
    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('closes without acting on Cancelar', async () => {
    const { user, onConfirm } = renderDialog()

    const dialog = await open(user)
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('locks both buttons and shows the pending label while it runs', async () => {
    const { user } = renderDialog({ pending: true, pendingLabel: 'Excluindo...' })

    const dialog = await open(user)

    expect(
      within(dialog).getByRole('button', { name: 'Excluindo...' }),
    ).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })

  it('styles the action as destructive only when asked', async () => {
    const { user } = renderDialog({ destructive: true })

    const dialog = await open(user)

    expect(within(dialog).getByRole('button', { name: 'Excluir' })).toHaveClass(
      'text-destructive',
    )
  })

  it('keeps the default style otherwise', async () => {
    const { user } = renderDialog()

    const dialog = await open(user)

    expect(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    ).not.toHaveClass('text-destructive')
  })
})
