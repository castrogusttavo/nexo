import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { RoleForm } from '../role-form'

const { saveRoleSetup } = vi.hoisted(() => ({ saveRoleSetup: vi.fn() }))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveRoleSetup }))

const continueButton = () => screen.getByRole('button', { name: 'Continuar' })
const skipButton = () =>
  screen.getByRole('button', { name: 'Pular esta etapa' })
const roleButton = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })

function submittedFormData(call = 0): FormData {
  return saveRoleSetup.mock.calls[call]?.[1]
}

beforeEach(() => {
  saveRoleSetup.mockResolvedValue({ ok: true })
})

describe('<RoleForm />', () => {
  it('keeps continue disabled until a role is picked', async () => {
    const { user } = renderWithProviders(<RoleForm />)

    expect(continueButton()).toBeDisabled()
    await user.click(roleButton('Designer'))
    expect(continueButton()).toBeEnabled()
  })

  it('submits the last picked role with the continue intent', async () => {
    const { user } = renderWithProviders(<RoleForm />)

    await user.click(roleButton('Designer'))
    await user.click(roleButton('Fundador / Executivo'))
    await user.click(continueButton())

    await waitFor(() => expect(saveRoleSetup).toHaveBeenCalled())
    const data = submittedFormData()
    expect(data.get('intent')).toBe('continue')
    expect(data.get('role')).toBe('FOUNDER_EXECUTIVE')
  })

  it('submits the skip intent with no role', async () => {
    const { user } = renderWithProviders(<RoleForm />)

    await user.click(skipButton())

    await waitFor(() => expect(saveRoleSetup).toHaveBeenCalled())
    const data = submittedFormData()
    expect(data.get('intent')).toBe('skip')
    expect(data.get('role')).toBe('')
  })

  it('disables the options while saving and shows the action error', async () => {
    let resolve!: (value: unknown) => void
    saveRoleSetup.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<RoleForm />)

    await user.click(roleButton('Developer'))
    await user.click(continueButton())

    expect(
      await screen.findByRole('button', { name: 'Salvando' }),
    ).toBeDisabled()
    expect(roleButton('Developer')).toBeDisabled()
    expect(skipButton()).toBeDisabled()

    resolve({ ok: false, error: 'Não foi possível salvar. Tente novamente.' })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente novamente.',
    )
  })
})
