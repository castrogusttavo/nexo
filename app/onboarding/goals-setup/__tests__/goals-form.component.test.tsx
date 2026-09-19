import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { GoalsForm } from '../goals-form'

const { saveGoalsSetup } = vi.hoisted(() => ({ saveGoalsSetup: vi.fn() }))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveGoalsSetup }))

const continueButton = () => screen.getByRole('button', { name: 'Continuar' })
const skipButton = () =>
  screen.getByRole('button', { name: 'Pular esta etapa' })
const goal = (name: RegExp) => screen.getByRole('checkbox', { name })

function submittedFormData(call = 0): FormData {
  return saveGoalsSetup.mock.calls[call]?.[1]
}

beforeEach(() => {
  saveGoalsSetup.mockResolvedValue({ ok: true })
})

describe('<GoalsForm />', () => {
  it('lists every goal option', () => {
    renderWithProviders(<GoalsForm />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  })

  it('enables continue only while at least one goal is checked', async () => {
    const { user } = renderWithProviders(<GoalsForm />)

    expect(continueButton()).toBeDisabled()
    await user.click(goal(/sprints de engenharia/i))
    expect(continueButton()).toBeEnabled()
    await user.click(goal(/roadmaps de produto/i))
    await user.click(goal(/sprints de engenharia/i))
    expect(continueButton()).toBeEnabled()
    await user.click(goal(/roadmaps de produto/i))
    expect(continueButton()).toBeDisabled()
  })

  it('always allows skipping', () => {
    renderWithProviders(<GoalsForm />)

    expect(skipButton()).toBeEnabled()
  })

  it('submits the checked goals with the continue intent', async () => {
    const { user } = renderWithProviders(<GoalsForm />)

    await user.click(goal(/roadmaps de produto/i))
    await user.click(goal(/substituir nossa ferramenta/i))
    await user.click(continueButton())

    await waitFor(() => expect(saveGoalsSetup).toHaveBeenCalled())
    const data = submittedFormData()
    expect(data.get('intent')).toBe('continue')
    expect(data.getAll('goals')).toEqual(['ROADMAP', 'REPLACE_TOOL'])
  })

  it('submits the skip intent without goals', async () => {
    const { user } = renderWithProviders(<GoalsForm />)

    await user.click(skipButton())

    await waitFor(() => expect(saveGoalsSetup).toHaveBeenCalled())
    const data = submittedFormData()
    expect(data.get('intent')).toBe('skip')
    expect(data.getAll('goals')).toEqual([])
  })

  it('shows a saving state and the action error', async () => {
    let resolve!: (value: unknown) => void
    saveGoalsSetup.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<GoalsForm />)

    await user.click(goal(/só estou explorando/i))
    await user.click(continueButton())

    expect(
      await screen.findByRole('button', { name: 'Salvando...' }),
    ).toBeDisabled()
    expect(skipButton()).toBeDisabled()

    resolve({ ok: false, error: 'Não foi possível salvar. Tente novamente' })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente novamente',
    )
  })
})
