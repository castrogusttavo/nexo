import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StateColorDTO, StateDTO } from '@/types/state'
import { ProjectStatesSettings } from '../project-states-settings'

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

// The real swatches are unlabeled color dots inside a popover; stub the
// picker with one named button per color so a pick can be expressed.
vi.mock('@/app/_components/ui/color-swatch-picker', () => ({
  ColorSwatchPicker: ({
    colors,
    onChange,
  }: {
    colors: { value: StateColorDTO }[]
    onChange: (color: StateColorDTO) => void
  }) => (
    <div>
      {colors.map((color) => (
        <button
          key={color.value}
          type='button'
          onClick={() => onChange(color.value)}
        >
          {`Cor ${color.value}`}
        </button>
      ))}
    </div>
  ),
}))

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

const BASE = '/api/workspaces/ws-1/projects/roadmap/states'

function buildState(overrides: Partial<StateDTO> = {}): StateDTO {
  return {
    id: 'state-1',
    name: 'Backlog',
    description: null,
    group: 'BACKLOG',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const STATES: StateDTO[] = [
  buildState({ id: 's-todo', name: 'A fazer', group: 'UNSTARTED', order: 2 }),
  buildState({
    id: 's-triage',
    name: 'Triagem',
    group: 'UNSTARTED',
    order: 1,
    isDefault: true,
  }),
  buildState({
    id: 's-doing',
    name: 'Fazendo',
    group: 'STARTED',
    color: 'YELLOW',
    description: 'Trabalho em andamento',
  }),
  buildState({ id: 's-done', name: 'Feito', group: 'COMPLETED' }),
]

type FetchSpy = ReturnType<typeof mockFetch>

// GETs always return the states list (the settings refetch after every
// mutation); any other method gets `mutationResponse`.
function mockStatesApi(mutationResponse?: () => Response | Promise<Response>) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (!init?.method || init.method === 'GET') return apiSuccess(STATES)
    return mutationResponse ? mutationResponse() : apiSuccess(STATES[0])
  })
  return fetchSpy
}

function mutationCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

async function renderSettings(fetchSpy = mockStatesApi()) {
  const utils = renderWithProviders(
    <ProjectStatesSettings workspaceId='ws-1' projectSlug='roadmap' />,
  )
  await screen.findByText('Triagem')
  return { ...utils, fetchSpy }
}

function groupCard(label: string) {
  const card = screen
    .getByText(label, { selector: 'button *' })
    .closest('[data-slot="card"]')
  if (!(card instanceof HTMLElement)) throw new Error(`No card for ${label}`)
  return card
}

const addButtonFor = (group: string) =>
  screen.getByRole('button', { name: `Adicionar estado em ${group}` })

function rowFor(name: string) {
  const row = screen.getByText(name).parentElement
  if (!row) throw new Error(`No row for ${name}`)
  return row
}

function rowIconButtons(name: string) {
  return {
    edit: screen.getByRole('button', { name: `Editar estado ${name}` }),
    remove: screen.getByRole('button', { name: `Excluir estado ${name}` }),
  }
}

describe('<ProjectStatesSettings /> listing', () => {
  it('lists the states under their group, sorted by order', async () => {
    await renderSettings()

    const unstarted = groupCard('Não iniciado')
    const names = within(unstarted)
      .getAllByText(/^(Triagem|A fazer)$/)
      .map((el) => el.textContent)
    expect(names).toEqual(['Triagem', 'A fazer'])
    expect(within(groupCard('Em progresso')).getByText('Fazendo')).toBeVisible()
    expect(within(groupCard('Concluído')).getByText('Feito')).toBeVisible()
  })

  it('keeps the add button out of the accordion trigger', async () => {
    await renderSettings()

    const add = addButtonFor('Backlog')
    expect(add.parentElement?.closest('button')).toBeNull()
    const trigger = screen.getByRole('button', { name: 'Backlog' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).not.toContainElement(add)
  })

  it('fetches the project states from the API', async () => {
    const { fetchSpy } = await renderSettings()

    expect(getFetchCall(fetchSpy).url).toBe(BASE)
  })

  it('labels the default state and offers to promote the others', async () => {
    await renderSettings()

    expect(within(rowFor('Triagem')).getByText('Padrão')).toBeInTheDocument()
    expect(
      within(rowFor('Triagem')).queryByRole('button', {
        name: 'Marcar como padrão',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(rowFor('A fazer')).getByRole('button', {
        name: 'Marcar como padrão',
      }),
    ).toBeInTheDocument()
  })

  it('marks a state as default', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(
      within(rowFor('A fazer')).getByRole('button', {
        name: 'Marcar como padrão',
      }),
    )

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${BASE}/s-todo/default`,
      method: 'PATCH',
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'State definido como padrão',
    })
  })
})

describe('<ProjectStatesSettings /> create', () => {
  it('creates a state in the chosen group with its default color', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(addButtonFor('Em progresso'))
    const createButton = screen.getByRole('button', { name: 'Criar' })
    expect(createButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Nome do state'), 'Revisão')
    await user.type(
      screen.getByPlaceholderText('Descreva este state para os membros'),
      'Aguardando code review',
    )
    await user.click(createButton)

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: BASE,
      method: 'POST',
      body: {
        name: 'Revisão',
        description: 'Aguardando code review',
        group: 'STARTED',
        color: 'YELLOW',
      },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'State criado',
    })
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText('Nome do state'),
      ).not.toBeInTheDocument(),
    )
  })

  it('sends the color picked in the swatch picker', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(addButtonFor('Backlog'))
    await user.click(screen.getByRole('button', { name: 'Cor BLUE' }))
    await user.type(screen.getByPlaceholderText('Nome do state'), 'Ideias')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0].body).toMatchObject({
      group: 'BACKLOG',
      color: 'BLUE',
    })
  })

  it('keeps create disabled for a whitespace-only name', async () => {
    const { user } = await renderSettings()

    await user.click(addButtonFor('Backlog'))
    await user.type(screen.getByPlaceholderText('Nome do state'), '   ')

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled()
  })

  it('closes the form on cancel without a request', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(addButtonFor('Backlog'))
    await user.type(screen.getByPlaceholderText('Nome do state'), 'Ideias')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.queryByPlaceholderText('Nome do state'),
    ).not.toBeInTheDocument()
    expect(mutationCalls(fetchSpy)).toHaveLength(0)
  })

  it('keeps the form open and reports the backend error', async () => {
    const { user } = await renderSettings(
      mockStatesApi(() => apiError(409, 'Já existe um state com esse nome')),
    )

    await user.click(addButtonFor('Backlog'))
    await user.type(screen.getByPlaceholderText('Nome do state'), 'Triagem')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Já existe um state com esse nome',
    })
    expect(screen.getByPlaceholderText('Nome do state')).toHaveValue('Triagem')
  })

  it('disables create while the request is pending', async () => {
    const { user } = await renderSettings(
      mockStatesApi(() => new Promise<Response>(() => {})),
    )

    await user.click(addButtonFor('Backlog'))
    await user.type(screen.getByPlaceholderText('Nome do state'), 'Ideias')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled(),
    )
  })
})

describe('<ProjectStatesSettings /> edit and delete', () => {
  it('renames a state through the prefilled edit form', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(rowIconButtons('Fazendo').edit)

    const name = screen.getByPlaceholderText('Nome do state')
    expect(name).toHaveValue('Fazendo')
    expect(
      screen.getByPlaceholderText('Descreva este state para os membros'),
    ).toHaveValue('Trabalho em andamento')

    await user.clear(name)
    await user.type(name, 'Em andamento')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/s-doing`,
      method: 'PATCH',
      body: {
        name: 'Em andamento',
        description: 'Trabalho em andamento',
        color: 'YELLOW',
      },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'State atualizado',
    })
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText('Nome do state'),
      ).not.toBeInTheDocument(),
    )
  })

  it('switches the open form when editing another state', async () => {
    const { user } = await renderSettings()

    await user.click(rowIconButtons('Triagem').edit)
    expect(screen.getByPlaceholderText('Nome do state')).toHaveValue('Triagem')

    await user.click(rowIconButtons('Feito').edit)
    const inputs = screen.getAllByPlaceholderText('Nome do state')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue('Feito')
  })

  it('deletes a state only after confirmation', async () => {
    const fetchSpy = mockStatesApi(() => new Response(null, { status: 204 }))
    const { user } = await renderSettings(fetchSpy)

    await user.click(rowIconButtons('A fazer').remove)
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Excluir state')).toBeInTheDocument()
    expect(mutationCalls(fetchSpy)).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${BASE}/s-todo`,
      method: 'DELETE',
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'State excluído',
    })
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const { user, fetchSpy } = await renderSettings()

    await user.click(rowIconButtons('A fazer').remove)
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(mutationCalls(fetchSpy)).toHaveLength(0)
  })
})
