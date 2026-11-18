import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { UpgradeForm } from '../upgrade-form'

vi.mock('@/lib/axiom/client', () => ({
  useLogger: () => ({ error: vi.fn(), info: vi.fn() }),
}))

const WORKSPACES = [
  { id: 'ws-1', name: 'Nexo', activePlan: 'FREE' },
  { id: 'ws-2', name: 'Atlas', activePlan: 'FREE' },
]

function renderForm(
  searchParams: Record<string, string> = { plan: 'PRO' },
  workspaces = WORKSPACES,
) {
  return renderWithProviders(<UpgradeForm workspaces={workspaces} />, {
    searchParams,
  })
}

describe('<UpgradeForm />', () => {
  it('explains what the upgrade applies to', () => {
    renderForm()

    expect(
      screen.getByRole('heading', { name: 'Atualize seu workspace' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Esta atualização aplica-se a um workspace da nuvem/),
    ).toBeInTheDocument()
  })

  it('preselects the first workspace and a single seat', () => {
    renderForm()

    expect(
      screen.getByRole('combobox', { name: /Workspace/ }),
    ).toHaveTextContent('Nexo')
    expect(screen.getByText(/^1 usuário • Nuvem$/)).toBeInTheDocument()
  })

  it('checks the plan named in the URL', () => {
    renderForm({ plan: 'BUSINESS' })

    expect(screen.getByRole('radio', { name: /Business/ })).toBeChecked()
    expect(screen.getByText('Plano Business')).toBeInTheDocument()
  })

  it('moves the summary to the plan the user picks', async () => {
    const { user } = renderForm()

    expect(screen.getByText('Plano Pro')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Business/ }))

    expect(screen.getByText('Plano Business')).toBeInTheDocument()
  })

  it('recounts the seats the summary charges for', async () => {
    renderForm()

    // jsdom gives a number input no text selection, so user-event can only
    // append digits to it — the edit is made as a plain change event.
    fireEvent.change(screen.getByRole('spinbutton', { name: /usuários/i }), {
      target: { value: '3' },
    })

    expect(screen.getByText(/^3 usuários • Nuvem$/)).toBeInTheDocument()
  })

  it('never charges for less than one seat', async () => {
    renderForm()

    fireEvent.change(screen.getByRole('spinbutton', { name: /usuários/i }), {
      target: { value: '0' },
    })

    expect(screen.getByText(/^1 usuário • Nuvem$/)).toBeInTheDocument()
  })

  it('switches the summary to the workspace the user selects', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('combobox', { name: /Workspace/ }))
    await user.click(await screen.findByRole('option', { name: 'Atlas' }))

    expect(
      screen.getByRole('combobox', { name: /Workspace/ }),
    ).toHaveTextContent('Atlas')
  })
})
