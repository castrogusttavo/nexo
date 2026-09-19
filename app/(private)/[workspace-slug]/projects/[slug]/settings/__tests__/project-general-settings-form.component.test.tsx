import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectGeneralSettingsForm } from '../project-general-settings-form'

const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

// The pickers are rich dropdowns (emoji catalogue, uploads) tested on their
// own; stub them down to a button that reports a fixed selection.
vi.mock(
  '@/app/_components/workspace/projects/modal/workspace-project-modal-emoji-icon-dialog',
  () => ({
    EmojiIconPicker: ({ onSelect }: { onSelect?: (emoji: string) => void }) => (
      <button type='button' onClick={() => onSelect?.('🚀')}>
        Escolher emoji
      </button>
    ),
  }),
)
vi.mock(
  '@/app/_components/workspace/projects/modal/workspace-project-modal-coverimage-dialog',
  () => ({
    CoverImagePicker: ({ onSelect }: { onSelect?: (url: string) => void }) => (
      <button
        type='button'
        onClick={() => onSelect?.('/coverImages/custom.jpg')}
      >
        Alterar capa
      </button>
    ),
  }),
)

type ToastMessages = {
  loading: string
  success: string
  error: (err: unknown) => string
}

async function lastToastOutcome() {
  const call = vi.mocked(toast.promise).mock.calls.at(-1)
  if (!call) throw new Error('toast.promise was not called')
  const [promise, messages] = call as unknown as [
    Promise<unknown>,
    ToastMessages,
  ]
  try {
    await promise
    return { type: 'success', message: messages.success }
  } catch (err) {
    return { type: 'error', message: messages.error(err) }
  }
}

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Roadmap',
    slug: 'roadmap',
    identifier: 'RM',
    description: 'Planejamento trimestral',
    emoji: '😊',
    coverImage: '/coverImages/image_1.jpg',
    isPublic: false,
    issueTypesEnabled: false,
    modulesEnabled: false,
    cyclesEnabled: false,
    estimatesEnabled: false,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: 'ws-1',
    archivedAt: null,
    createdAt: '2026-03-15T12:00:00.000Z',
    updatedAt: '2026-03-15T12:00:00.000Z',
    ...overrides,
  }
}

function renderForm(project = buildProject()) {
  return renderWithProviders(
    <ProjectGeneralSettingsForm
      workspaceId='ws-1'
      workspaceSlug='acme'
      project={project}
    />,
  )
}

// The labels here are not bound to their inputs (no htmlFor), so resolve
// the control through the surrounding Field instead.
function fieldControl(label: string) {
  const field = screen
    .getByText(label, { selector: 'label' })
    .closest('[data-slot="field"]')
  if (!(field instanceof HTMLElement)) throw new Error(`No field for ${label}`)
  return within(field).getByRole('textbox')
}

const saveButton = () =>
  screen.getByRole('button', { name: 'Atualizar projeto' })

beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
})

describe('<ProjectGeneralSettingsForm /> general settings', () => {
  it('prefills the form from the project', () => {
    renderForm()

    expect(fieldControl('Nome do projeto')).toHaveValue('Roadmap')
    expect(fieldControl('Descrição')).toHaveValue('Planejamento trimestral')
    expect(fieldControl('ID do projeto')).toHaveValue('RM')
    expect(screen.getByText(/RM ·/)).toHaveTextContent('RM · Privado')
    expect(screen.getByText(/Criado em/)).toHaveTextContent(
      `Criado em ${new Date('2026-03-15T12:00:00.000Z').toLocaleDateString('pt-BR')}`,
    )
  })

  it('upper-cases the identifier as it is typed', async () => {
    const { user } = renderForm()

    const identifier = fieldControl('ID do projeto')
    await user.clear(identifier)
    await user.type(identifier, 'ops')

    expect(identifier).toHaveValue('OPS')
  })

  it('patches the project with the edited values and refreshes the route', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject()),
    )
    const { user } = renderForm()

    const name = fieldControl('Nome do projeto')
    await user.clear(name)
    await user.type(name, 'Roadmap 2027')
    await user.click(screen.getByRole('button', { name: 'Escolher emoji' }))
    await user.click(screen.getByRole('button', { name: 'Alterar capa' }))
    await user.click(saveButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces/ws-1/projects/roadmap')
    expect(method).toBe('PATCH')
    expect(body).toEqual({
      name: 'Roadmap 2027',
      description: 'Planejamento trimestral',
      identifier: 'RM',
      emoji: '🚀',
      coverImage: '/coverImages/custom.jpg',
      isPublic: false,
    })

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Projeto atualizado',
    })
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('omits a cleared identifier instead of sending an empty string', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject()),
    )
    const { user } = renderForm()

    await user.clear(fieldControl('ID do projeto'))
    await user.click(saveButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).not.toHaveProperty('identifier')
  })

  it('sends isPublic: true after switching visibility to public', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject()),
    )
    const { user } = renderForm()

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Público/ }))
    expect(screen.getByRole('combobox')).toHaveTextContent('Público')

    await user.click(saveButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toMatchObject({ isPublic: true })
  })

  it('disables the save button while the update is pending', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderForm()

    await user.click(saveButton())

    await waitFor(() => expect(saveButton()).toBeDisabled())
  })

  it('surfaces the backend error and does not refresh', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Esse ID já está em uso', 'CONFLICT'),
    )
    const { user } = renderForm()

    await user.click(saveButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Esse ID já está em uso',
    })
    await waitFor(() => expect(saveButton()).toBeEnabled())
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('<ProjectGeneralSettingsForm /> danger zone', () => {
  it('archives the project after confirmation and goes back to the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildProject({ archivedAt: '2026-04-01T00:00:00.000Z' })),
    )
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(fetchSpy).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces/ws-1/projects/roadmap/archive')
    expect(method).toBe('PATCH')
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Projeto arquivado',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme/projects'))
  })

  it('does not archive when the confirmation is cancelled', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('keeps the user on the page when archiving fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Sem permissão',
    })
    expect(push).not.toHaveBeenCalled()
  })

  // Deleting is not covered: `handleDelete` currently calls
  // `archiveProject.mutateAsync()` instead of `deleteProject`, so confirming
  // "Excluir" archives the project. See the report for details.
})
