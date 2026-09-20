import { screen, waitFor } from '@testing-library/react'
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
import type {
  EstimateModelDTO,
  EstimateSettingsDTO,
  EstimateSystemDTO,
  EstimateValueDTO,
} from '@/types/estimate'
import { EstimateSystemForm } from '../dialog-estimate-create'

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
  system: 'POINTS',
  model: 'FIBONACCI',
  projectId: 'project-1',
  values: [buildValue('v-1', '1', 0), buildValue('v-2', '2', 1)],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

type FetchSpy = ReturnType<typeof mockFetch>

/** GETs always return the settings; everything else gets `mutationResponse`. */
function mockEstimateApi(
  mutationResponse?: () => Response | Promise<Response>,
) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (!init?.method || init.method === 'GET') return apiSuccess(SETTINGS)
    return mutationResponse ? mutationResponse() : apiSuccess(SETTINGS)
  })
  return fetchSpy
}

function mutationCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

const onBack = vi.fn()
const onDone = vi.fn()

async function renderForm({
  currentSystem = 'POINTS' as EstimateSystemDTO,
  currentModel = 'FIBONACCI' as EstimateModelDTO,
  fetchSpy = mockEstimateApi(),
}: {
  currentSystem?: EstimateSystemDTO
  currentModel?: EstimateModelDTO
  fetchSpy?: FetchSpy
} = {}) {
  const utils = renderWithProviders(
    // `DialogTitle` reads the dialog root context; in the app this form is
    // always rendered inside the edit dialog.
    <Dialog open>
      <EstimateSystemForm
        workspaceId='ws-1'
        projectSlug='roadmap'
        currentSystem={currentSystem}
        currentModel={currentModel}
        onBack={onBack}
        onDone={onDone}
      />
    </Dialog>,
  )
  // The settings query has to settle before a confirm can delete old values.
  await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
  return { ...utils, fetchSpy }
}

const confirmButton = () => screen.getByRole('button', { name: 'Confirmar' })
const tab = (name: string) => screen.getByRole('tab', { name })

const backButton = () => screen.getByRole('button', { name: 'Voltar' })

beforeEach(() => {
  onBack.mockReset()
  onDone.mockReset()
})

describe('<EstimateSystemForm /> selection', () => {
  it('opens on the system the project already uses', async () => {
    await renderForm()

    expect(
      screen.getByText('Editar sistema de estimativas'),
    ).toBeInTheDocument()
    expect(tab('Pontos')).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('button', { name: /Fibonacci/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Linear/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Squares/ })).toBeInTheDocument()
  })

  it('previews the values each model produces', async () => {
    await renderForm()

    expect(screen.getByRole('button', { name: /Fibonacci/ })).toHaveTextContent(
      '1, 2, 3, 5, 8, 13, 21, 34, 55',
    )
  })

  it('opens on the category tab for a category project', async () => {
    await renderForm({
      currentSystem: 'CATEGORIES',
      currentModel: 'T_SHIRT_SIZES',
    })

    expect(tab('Categorias')).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('button', { name: /Tamanhos \(T-shirt\)/ }),
    ).toBeInTheDocument()
  })

  it('keeps confirm enabled for the model already in use', async () => {
    await renderForm()

    expect(confirmButton()).toBeEnabled()
  })

  it('clears the chosen model when the system tab changes', async () => {
    const { user } = await renderForm()

    await user.click(tab('Tempo'))

    expect(tab('Tempo')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Horas/ })).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('re-enables confirm once a model is picked in the new system', async () => {
    const { user } = await renderForm()

    await user.click(tab('Categorias'))
    await user.click(screen.getByRole('button', { name: /Fácil a difícil/ }))

    expect(confirmButton()).toBeEnabled()
  })

  it('calls onBack from the header button', async () => {
    const { user } = await renderForm()

    await user.click(backButton())

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('<EstimateSystemForm /> confirmation', () => {
  it('switches the system, seeds the preset and drops the old values', async () => {
    const fetchSpy = mockEstimateApi()
    const { user } = await renderForm({ fetchSpy })

    await user.click(tab('Tempo'))
    await user.click(screen.getByRole('button', { name: /Horas/ }))
    await user.click(confirmButton())

    // 6 preset POSTs + 1 PATCH + 2 deletions of the previous values: the new
    // values exist before the settings flip, and the old ones only go after.
    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(9))
    const calls = mutationCalls(fetchSpy)

    expect(calls.slice(0, 6)).toEqual(
      ['1h', '2h', '4h', '8h', '16h', '40h'].map((value) => ({
        url: `${BASE}/values`,
        method: 'POST',
        body: { value },
      })),
    )
    expect(calls[6]).toEqual({
      url: BASE,
      method: 'PATCH',
      body: { system: 'TIME', model: 'HOURS' },
    })
    expect(calls.slice(7)).toEqual([
      { url: `${BASE}/values/v-1`, method: 'DELETE', body: undefined },
      { url: `${BASE}/values/v-2`, method: 'DELETE', body: undefined },
    ])

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Sistema de estimativa atualizado',
    })
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('keeps the dialog open and reports a failed switch', async () => {
    const fetchSpy = mockEstimateApi(() =>
      apiError(403, 'Sem permissão para alterar estimativas'),
    )
    const { user } = await renderForm({ fetchSpy })

    await user.click(confirmButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Sem permissão para alterar estimativas',
    })
    // The very first POST failed, so nothing else was attempted.
    expect(mutationCalls(fetchSpy)).toHaveLength(1)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('undoes the half-written preset and keeps the old system when a value fails', async () => {
    let created = 0
    const fetchSpy = mockEstimateApi()
    fetchSpy.mockImplementation(async (input, init) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') return apiSuccess(SETTINGS)
      if (method === 'POST') {
        created += 1
        if (created === 3) return apiError(500, 'Falha ao criar valor')
        return apiSuccess(
          buildValue(`new-${created}`, String(created), created),
        )
      }
      if (String(input).endsWith('/estimate')) {
        throw new Error('the settings must not be patched after a failure')
      }
      return new Response(null, { status: 204 })
    })
    const { user } = await renderForm({ fetchSpy })

    await user.click(tab('Tempo'))
    await user.click(screen.getByRole('button', { name: /Horas/ }))
    await user.click(confirmButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Falha ao criar valor',
    })

    const calls = mutationCalls(fetchSpy)
    // Three POSTs (the third one failed) and then the two survivors are
    // deleted again — the settings are never patched and no previous value
    // is touched.
    expect(calls.filter((call) => call.method === 'PATCH')).toHaveLength(0)
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(3)
    expect(calls.filter((call) => call.method === 'DELETE')).toEqual([
      { url: `${BASE}/values/new-2`, method: 'DELETE', body: undefined },
      { url: `${BASE}/values/new-1`, method: 'DELETE', body: undefined },
    ])
    expect(onDone).not.toHaveBeenCalled()
    expect(confirmButton()).toBeEnabled()
  })

  it('warns instead of failing when an old value survives the switch', async () => {
    const fetchSpy = mockEstimateApi()
    fetchSpy.mockImplementation(async (_input, init) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') return apiSuccess(SETTINGS)
      if (method === 'DELETE')
        return apiError(409, 'Valor em uso por uma issue')
      return apiSuccess(SETTINGS)
    })
    const { user } = await renderForm({ fetchSpy })

    await user.click(confirmButton())

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Sistema de estimativa atualizado',
    })
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        'O sistema foi atualizado, mas alguns valores antigos não foram removidos.',
      ),
    )
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('disables confirm while the chain of requests runs', async () => {
    const fetchSpy = mockEstimateApi(() => new Promise<Response>(() => {}))
    const { user } = await renderForm({ fetchSpy })

    await user.click(confirmButton())

    await waitFor(() => expect(confirmButton()).toBeDisabled())
    expect(onDone).not.toHaveBeenCalled()
  })
})
