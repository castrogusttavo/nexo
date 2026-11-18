import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectLabelDTO } from '@/src/__tests__/factories/dto/project-label.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WorkspaceSettingsProjectLabelsTab } from '../workspace-settings-project-labels-tab'
import { requests, routeFetch, toastOutcome } from './_helpers'

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

const URL = '/api/workspaces/ws-1/project-labels'

const LABELS = [
  buildProjectLabelDTO({ id: 'plabel-1', name: 'Marketing', color: 'PURPLE' }),
  buildProjectLabelDTO({ id: 'plabel-2', name: 'Q4', color: 'GREEN' }),
]

function renderTab(canConfigure = true) {
  return renderWithProviders(
    <WorkspaceSettingsProjectLabelsTab
      workspaceId='ws-1'
      canConfigure={canConfigure}
    />,
  )
}

beforeEach(() => {
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectLabelsTab /> display', () => {
  it('lists the labels', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(LABELS) })
    renderTab()

    expect(await screen.findByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('Q4')).toBeInTheDocument()
  })

  it('says so when there are none', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess([]) })
    renderTab()

    expect(
      await screen.findByText('Nenhuma etiqueta criada ainda.'),
    ).toBeInTheDocument()
  })

  it('shows an error when the labels cannot be loaded', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiError(500) })
    renderTab()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as etiquetas dos projetos.',
    )
  })
})

describe('<WorkspaceSettingsProjectLabelsTab /> permissions', () => {
  it('shows a member the labels and no way to change them', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(LABELS) })
    renderTab(false)

    await screen.findByText('Marketing')

    expect(
      screen.queryByRole('button', { name: 'Adicionar etiqueta' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Editar etiqueta/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Excluir etiqueta/ }),
    ).not.toBeInTheDocument()
  })
})

describe('<WorkspaceSettingsProjectLabelsTab /> creating and editing', () => {
  it('opens the form from "Adicionar etiqueta" and hides the button meanwhile', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(LABELS) })
    const { user } = renderTab()
    await screen.findByText('Marketing')

    await user.click(screen.getByRole('button', { name: 'Adicionar etiqueta' }))

    expect(screen.getByLabelText('Título da etiqueta')).toHaveValue('')
    expect(
      screen.queryByRole('button', { name: 'Adicionar etiqueta' }),
    ).not.toBeInTheDocument()
  })

  it('closes the form on cancel and brings the button back', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(LABELS) })
    const { user } = renderTab()
    await screen.findByText('Marketing')
    await user.click(screen.getByRole('button', { name: 'Adicionar etiqueta' }))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.queryByLabelText('Título da etiqueta'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Adicionar etiqueta' }),
    ).toBeInTheDocument()
  })

  it('creates a label and shows it in the list', async () => {
    const created = buildProjectLabelDTO({ id: 'plabel-3', name: 'Growth' })
    let listed = LABELS
    routeFetch({
      [`GET ${URL}`]: () => apiSuccess(listed),
      [`POST ${URL}`]: () => {
        listed = [...LABELS, created]
        return apiSuccess(created, 201)
      },
    })
    const { user } = renderTab()
    await screen.findByText('Marketing')

    await user.click(screen.getByRole('button', { name: 'Adicionar etiqueta' }))
    await user.type(screen.getByLabelText('Título da etiqueta'), 'Growth')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByText('Growth')).toBeInTheDocument()
  })

  it('edits a label with its name filled in', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(LABELS) })
    const { user } = renderTab()
    await screen.findByText('Marketing')

    await user.click(
      screen.getByRole('button', { name: 'Editar etiqueta Marketing' }),
    )

    expect(screen.getByLabelText('Título da etiqueta')).toHaveValue('Marketing')
  })
})

describe('<WorkspaceSettingsProjectLabelsTab /> deleting', () => {
  it('asks first, then DELETEs the label', async () => {
    const spy = routeFetch({
      [`GET ${URL}`]: () => apiSuccess(LABELS),
      [`DELETE ${URL}/plabel-1`]: () => apiSuccess(null),
    })
    const { user } = renderTab()
    await screen.findByText('Marketing')

    await user.click(
      screen.getByRole('button', { name: 'Excluir etiqueta Marketing' }),
    )
    expect(requests(spy).some((r) => r.method === 'DELETE')).toBe(false)
    expect(
      within(screen.getByRole('alertdialog')).getByText(
        /removida de todos os projetos/,
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(
        requests(spy).some(
          (r) => r.method === 'DELETE' && r.url === `${URL}/plabel-1`,
        ),
      ).toBe(true),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Etiqueta excluída',
    })
  })

  it('surfaces the backend message when the delete fails', async () => {
    routeFetch({
      [`GET ${URL}`]: () => apiSuccess(LABELS),
      [`DELETE ${URL}/plabel-1`]: () =>
        apiError(403, 'Sem permissão para esta etiqueta'),
    })
    const { user } = renderTab()
    await screen.findByText('Marketing')

    await user.click(
      screen.getByRole('button', { name: 'Excluir etiqueta Marketing' }),
    )
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Sem permissão para esta etiqueta',
    })
  })
})
