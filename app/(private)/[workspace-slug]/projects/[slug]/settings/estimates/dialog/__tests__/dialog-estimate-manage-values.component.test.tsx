import { screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from '@/components/ui/dialog'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { EstimateSettingsDTO, EstimateValueDTO } from '@/types/estimate'
import { EstimateValuesForm } from '../dialog-estimate-manage-values'

vi.mock('sonner', () => ({
  toast: {
    // sonner subscribes to the promise it is handed; mirroring that keeps a
    // rejection the toast reports from surfacing as an unhandled rejection.
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

// The real list is a dnd-kit surface: pointer drags need layout boxes jsdom
// does not compute. The stub keeps the rows and exposes the drop callback as
// a button so a reorder can be expressed.
vi.mock('@/components/ui/sortable', () => ({
  Sortable: ({
    value,
    onValueChange,
    children,
  }: {
    value: EstimateValueDTO[]
    onValueChange: (next: EstimateValueDTO[]) => void
    children: ReactNode
  }) => (
    <div>
      <button type='button' onClick={() => onValueChange([...value].reverse())}>
        Inverter ordem
      </button>
      {children}
    </div>
  ),
  SortableItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SortableItemHandle: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
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

const BASE = '/api/workspaces/ws-1/projects/roadmap/estimate'

function buildValue(
  id: string,
  value: string,
  order: number,
): EstimateValueDTO {
  return {
    id,
    value,
    order,
    estimateSettingsId: 'settings-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const SETTINGS: EstimateSettingsDTO = {
  id: 'settings-1',
  system: 'CATEGORIES',
  model: 'T_SHIRT_SIZES',
  projectId: 'project-1',
  values: [buildValue('v-xs', 'XS', 0), buildValue('v-m', 'M', 1)],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

type FetchSpy = ReturnType<typeof mockFetch>

/** GETs always return the settings; everything else gets `mutationResponse`. */
function mockEstimateApi(
  mutationResponse?: () => Response | Promise<Response>,
  settings: EstimateSettingsDTO | null = SETTINGS,
) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (!init?.method || init.method === 'GET') {
      return settings ? apiSuccess(settings) : apiError(404, 'Sem estimativas')
    }
    return mutationResponse
      ? mutationResponse()
      : apiSuccess(SETTINGS.values[0])
  })
  return fetchSpy
}

function mutationCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

const onBack = vi.fn()

async function renderForm(fetchSpy = mockEstimateApi(), waitForList = true) {
  const utils = renderWithProviders(
    // `DialogTitle` reads the dialog root context; in the app this form is
    // always rendered inside the edit dialog.
    <Dialog open>
      <EstimateValuesForm
        workspaceId='ws-1'
        projectSlug='roadmap'
        onBack={onBack}
      />
    </Dialog>,
  )
  if (waitForList) await screen.findByText('XS')
  return { ...utils, fetchSpy }
}

const newValueInput = () => screen.getByPlaceholderText('Novo valor')
const addButton = () => screen.getByRole('button', { name: 'Adicionar' })

/** The row wrapping `value`, from which its two icon buttons are reachable. */
function rowFor(value: string) {
  const row = screen.getByText(value).parentElement
  if (!row) throw new Error(`No row for ${value}`)
  return row
}

/** Edit/delete are icon-only buttons named after the value they act on. */
function rowButtons(row: HTMLElement) {
  return {
    edit: within(row).getByRole('button', { name: /^Editar valor / }),
    remove: within(row).getByRole('button', { name: /^Excluir valor / }),
  }
}

const backButton = () => screen.getByRole('button', { name: 'Voltar' })

beforeEach(() => {
  onBack.mockReset()
})

describe('<EstimateValuesForm /> listing', () => {
  it('lists the values of the current estimate system', async () => {
    const { fetchSpy } = await renderForm()

    expect(screen.getByText('XS')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(BASE)
  })

  it('renders an empty list when the settings cannot be loaded', async () => {
    await renderForm(mockEstimateApi(undefined, null), false)

    expect(await screen.findByPlaceholderText('Novo valor')).toBeInTheDocument()
    expect(screen.queryByText('XS')).not.toBeInTheDocument()
  })

  it('calls onBack from the header button', async () => {
    const { user } = await renderForm()

    await user.click(backButton())

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('persists a new order after a drop', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(screen.getByRole('button', { name: 'Inverter ordem' }))

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/values/reorder`,
      method: 'PATCH',
      body: { valueIds: ['v-m', 'v-xs'] },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Ordem atualizada',
    })
  })
})

describe('<EstimateValuesForm /> adding', () => {
  it('keeps the add button disabled until something is typed', async () => {
    const { user } = await renderForm()

    expect(addButton()).toBeDisabled()

    await user.type(newValueInput(), '   ')
    expect(addButton()).toBeDisabled()

    await user.type(newValueInput(), 'L')
    expect(addButton()).toBeEnabled()
  })

  it('creates the trimmed value and clears the field', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.type(newValueInput(), '  L  ')
    await user.click(addButton())

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/values`,
      method: 'POST',
      body: { value: 'L' },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Valor adicionado',
    })
    await waitFor(() => expect(newValueInput()).toHaveValue(''))
  })

  it('creates the value on Enter', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.type(newValueInput(), 'XL{Enter}')

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0].body).toEqual({ value: 'XL' })
  })

  it('ignores Enter on an empty field', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(newValueInput())
    await user.keyboard('{Enter}')

    expect(mutationCalls(fetchSpy)).toHaveLength(0)
  })

  it('keeps the typed value when the API rejects it', async () => {
    const fetchSpy = mockEstimateApi(() =>
      apiError(409, 'Esse valor já existe'),
    )
    const { user } = await renderForm(fetchSpy)

    await user.type(newValueInput(), 'XS')
    await user.click(addButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Esse valor já existe',
    })
    expect(newValueInput()).toHaveValue('XS')
  })

  it('disables the add button while the request is pending', async () => {
    const fetchSpy = mockEstimateApi(() => new Promise<Response>(() => {}))
    const { user } = await renderForm(fetchSpy)

    await user.type(newValueInput(), 'L')
    await user.click(addButton())

    await waitFor(() => expect(addButton()).toBeDisabled())
  })
})

describe('<EstimateValuesForm /> editing', () => {
  it('opens a prefilled input on the pencil button', async () => {
    const { user } = await renderForm()

    await user.click(rowButtons(rowFor('XS')).edit)

    expect(screen.getByDisplayValue('XS')).toBeInTheDocument()
    expect(screen.queryByText('XS')).not.toBeInTheDocument()
  })

  it('saves the renamed value on Enter', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('XS')).edit)
    const input = screen.getByDisplayValue('XS')
    await user.clear(input)
    await user.type(input, '  PP  {Enter}')

    await waitFor(() =>
      expect(mutationCalls(fetchSpy).length).toBeGreaterThan(0),
    )
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/values/v-xs`,
      method: 'PATCH',
      body: { value: 'PP' },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Valor atualizado',
    })
  })

  it('saves the renamed value when the input loses focus', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('M')).edit)
    const input = screen.getByDisplayValue('M')
    await user.clear(input)
    await user.type(input, 'GG')
    await user.click(newValueInput())

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: `${BASE}/values/v-m`,
      method: 'PATCH',
      body: { value: 'GG' },
    })
  })

  it('closes the editor on Escape without saving', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('XS')).edit)
    const input = screen.getByDisplayValue('XS')
    await user.clear(input)
    await user.type(input, 'PP')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.getByText('XS')).toBeInTheDocument())
    expect(mutationCalls(fetchSpy)).toHaveLength(0)
  })

  it('refuses to save an empty value', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('XS')).edit)
    const input = screen.getByDisplayValue('XS')
    await user.clear(input)
    await user.type(input, '{Enter}')

    expect(mutationCalls(fetchSpy)).toHaveLength(0)
    expect(input).toHaveValue('')
  })

  it('keeps the editor open when the API rejects the rename', async () => {
    const fetchSpy = mockEstimateApi(() =>
      apiError(409, 'Esse valor já existe'),
    )
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('XS')).edit)
    const input = screen.getByDisplayValue('XS')
    await user.clear(input)
    await user.type(input, 'M{Enter}')

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Esse valor já existe',
    })
    expect(screen.getByDisplayValue('M')).toBeInTheDocument()
  })
})

describe('<EstimateValuesForm /> deleting', () => {
  it('asks for confirmation before deleting', async () => {
    const fetchSpy = mockEstimateApi(() => new Response(null, { status: 204 }))
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('M')).remove)

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Excluir valor')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('não pode ser desfeita')
    expect(mutationCalls(fetchSpy)).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${BASE}/values/v-m`,
      method: 'DELETE',
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Valor excluído',
    })
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('M')).remove)
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(mutationCalls(fetchSpy)).toHaveLength(0)
  })

  it('reports a failed deletion', async () => {
    const fetchSpy = mockEstimateApi(() => apiError(403, 'Sem permissão'))
    const { user } = await renderForm(fetchSpy)

    await user.click(rowButtons(rowFor('M')).remove)
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Sem permissão',
    })
  })
})
