import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { WorkspaceForm } from '../workspace-form'

const { createOnboardingWorkspace } = vi.hoisted(() => ({
  createOnboardingWorkspace: vi.fn(),
}))

// The real module is a server action that touches the session and DB;
// the form only cares about the `(prevState, formData) => state` contract.
vi.mock('../actions', () => ({ createOnboardingWorkspace }))

const nameInput = () =>
  screen.getByRole('textbox', { name: /nome do seu workspace/i })
const slugInput = () =>
  screen.getByRole('textbox', { name: /defina o url do seu workspace/i })
const submitButton = () =>
  screen.getByRole('button', { name: 'Criar workspace' })

function submittedFormData(call = 0): FormData {
  return createOnboardingWorkspace.mock.calls[call]?.[1]
}

beforeEach(() => {
  createOnboardingWorkspace.mockResolvedValue({ ok: true })
})

describe('<WorkspaceForm />', () => {
  it('keeps submit disabled until the name has at least 2 characters', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    expect(submitButton()).toBeDisabled()
    await user.type(nameInput(), 'A')
    expect(submitButton()).toBeDisabled()
    await user.type(nameInput(), 'c')
    expect(submitButton()).toBeEnabled()
  })

  it('derives a URL-safe slug from the workspace name', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), '  Acme   Labs! 2024 ')

    expect(slugInput()).toHaveValue('acme-labs-2024')
  })

  it('stops following the name once the slug is edited by hand', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.type(slugInput(), 'My-Custom_Slug')
    await user.type(nameInput(), ' Corp')

    expect(slugInput()).toHaveValue('my-customslug')
  })

  it('turns spaces typed in the URL field into hyphens', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.type(slugInput(), 'My Custom Slug')

    expect(slugInput()).toHaveValue('my-custom-slug')
  })

  it('transliterates accents instead of dropping the letter', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Café São João')

    expect(slugInput()).toHaveValue('cafe-sao-joao')
  })

  it('submits the slug without a dangling hyphen', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.type(slugInput(), 'acme ')
    await user.click(submitButton())

    await waitFor(() => expect(createOnboardingWorkspace).toHaveBeenCalled())
    expect(submittedFormData().get('slug')).toBe('acme')
  })

  it('blocks submit when the slug is cleared below 2 characters', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.type(slugInput(), 'a')

    expect(submitButton()).toBeDisabled()
  })

  it('submits name, slug and the selected team size', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme Labs')
    await user.click(screen.getByRole('button', { name: '11-50' }))
    await user.click(submitButton())

    await waitFor(() => expect(createOnboardingWorkspace).toHaveBeenCalled())
    const data = submittedFormData()
    expect(data.get('name')).toBe('Acme Labs')
    expect(data.get('slug')).toBe('acme-labs')
    expect(data.get('teamSize')).toBe('11-50')
  })

  it('sends an empty team size when none was picked', async () => {
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.click(submitButton())

    await waitFor(() => expect(createOnboardingWorkspace).toHaveBeenCalled())
    expect(submittedFormData().get('teamSize')).toBe('')
  })

  it('shows a pending state while the workspace is being created', async () => {
    let resolve!: (value: unknown) => void
    createOnboardingWorkspace.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.click(submitButton())

    expect(
      await screen.findByRole('button', { name: 'Criando...' }),
    ).toBeDisabled()
    expect(nameInput()).toBeDisabled()
    expect(slugInput()).toBeDisabled()

    resolve({ ok: false })
    expect(
      await screen.findByRole('button', { name: 'Criar workspace' }),
    ).toBeInTheDocument()
  })

  it('shows the error returned by the action', async () => {
    createOnboardingWorkspace.mockResolvedValue({
      ok: false,
      error: 'Esta URL já está em uso. Escolha outra.',
    })
    const { user } = renderWithProviders(<WorkspaceForm />)

    await user.type(nameInput(), 'Acme')
    await user.click(submitButton())

    expect(
      await screen.findByText('Esta URL já está em uso. Escolha outra.'),
    ).toBeInTheDocument()
  })
})
