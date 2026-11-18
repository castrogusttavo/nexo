import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildDefaultProjectStateDTOs,
  buildProjectStateDTO,
} from '@/src/__tests__/factories/dto/project-state.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WorkspaceSettingsProjectStatesList } from '../workspace-settings-project-states-list'
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

const URL = '/api/workspaces/ws-1/project-states'

// The six seeded states plus a second one in Planejamento, so that group can
// lose a state.
const SECOND = buildProjectStateDTO({
  id: 'pstate-extra',
  name: 'Refinamento',
  group: 'PLANNING',
  color: 'BLUE',
  order: 1,
  isDefault: false,
})
const STATES = [...buildDefaultProjectStateDTOs(), SECOND]

function renderList(canConfigure = true) {
  return renderWithProviders(
    <WorkspaceSettingsProjectStatesList
      workspaceId='ws-1'
      canConfigure={canConfigure}
    />,
  )
}

beforeEach(() => {
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectStatesList /> display', () => {
  it('shows every lifecycle group with its states, Execução included', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()

    for (const label of [
      'Rascunho',
      'Planejamento',
      'Execução',
      'Monitoramento',
      'Concluído',
      'Cancelado',
    ]) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('Refinamento')).toBeInTheDocument()
  })

  it('marks the default state', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()

    await screen.findByText('Refinamento')

    expect(screen.getAllByText('Padrão')).toHaveLength(1)
  })

  it('shows an error when the states cannot be loaded', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiError(500) })
    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os estados dos projetos.',
    )
  })

  it('lists the states of a group in their order', async () => {
    routeFetch({
      [`GET ${URL}`]: () =>
        apiSuccess([
          { ...SECOND, order: 0 },
          ...buildDefaultProjectStateDTOs().map((state) =>
            state.group === 'PLANNING' ? { ...state, order: 1 } : state,
          ),
        ]),
    })
    renderList()

    await screen.findByText('Refinamento')
    const names = screen
      .getAllByRole('button', { name: /^Editar estado / })
      .map((button) => button.getAttribute('aria-label'))

    expect(names.indexOf('Editar estado Refinamento')).toBeLessThan(
      names.indexOf('Editar estado Planejamento'),
    )
  })
})

describe('<WorkspaceSettingsProjectStatesList /> permissions', () => {
  it('shows no way to change anything to a member', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList(false)

    await screen.findByText('Refinamento')

    expect(
      screen.queryByRole('button', { name: /^Adicionar estado/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Editar estado/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Excluir estado/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Marcar como padrão' }),
    ).not.toBeInTheDocument()
  })

  it('still tells a member which state is the default', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList(false)

    await screen.findByText('Refinamento')

    expect(screen.getAllByText('Padrão')).toHaveLength(1)
  })
})

describe('<WorkspaceSettingsProjectStatesList /> creating and editing', () => {
  it('opens a form inside the group of the add button', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Adicionar estado em Execução' }),
    )

    expect(screen.getByLabelText('Nome do estado')).toHaveValue('')
    expect(screen.getAllByLabelText('Nome do estado')).toHaveLength(1)
  })

  it('closes the form on cancel', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    const { user } = renderList()
    await screen.findByText('Refinamento')
    await user.click(
      screen.getByRole('button', { name: 'Adicionar estado em Execução' }),
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Nome do estado')).not.toBeInTheDocument()
  })

  it('creates a state in that group and refreshes the list', async () => {
    const created = buildProjectStateDTO({
      id: 'pstate-new',
      name: 'Em revisão',
      group: 'EXECUTION',
      color: 'YELLOW',
      isDefault: false,
    })
    let listed = STATES
    const spy = routeFetch({
      [`GET ${URL}`]: () => apiSuccess(listed),
      [`POST ${URL}`]: () => {
        listed = [...STATES, created]
        return apiSuccess(created, 201)
      },
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Adicionar estado em Execução' }),
    )
    await user.type(screen.getByLabelText('Nome do estado'), 'Em revisão')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Em revisão')).toBeInTheDocument()
    expect(requests(spy).find((r) => r.method === 'POST')?.body).toMatchObject({
      name: 'Em revisão',
      group: 'EXECUTION',
    })
  })

  it('opens the edit form with the state filled in', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Editar estado Refinamento' }),
    )

    expect(screen.getByLabelText('Nome do estado')).toHaveValue('Refinamento')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })
})

describe('<WorkspaceSettingsProjectStatesList /> default', () => {
  it('offers "Marcar como padrão" only on states that are not the default', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()
    await screen.findByText('Refinamento')

    // 7 states, one of them the default
    expect(
      screen.getAllByRole('button', { name: 'Marcar como padrão' }),
    ).toHaveLength(6)
  })

  it('PATCHes the default url of the chosen state', async () => {
    const spy = routeFetch({
      [`GET ${URL}`]: () => apiSuccess(STATES),
      [`PATCH ${URL}/pstate-extra/default`]: () =>
        apiSuccess({ ...SECOND, isDefault: true }),
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')
    const row = screen
      .getByRole('button', { name: 'Editar estado Refinamento' })
      .closest('div.group') as HTMLElement

    await user.click(
      within(row).getByRole('button', { name: 'Marcar como padrão' }),
    )

    await waitFor(() =>
      expect(
        requests(spy).some(
          (r) =>
            r.method === 'PATCH' && r.url === `${URL}/pstate-extra/default`,
        ),
      ).toBe(true),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estado definido como padrão',
    })
  })
})

describe('<WorkspaceSettingsProjectStatesList /> deleting', () => {
  it('blocks deleting the default state', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()
    await screen.findByText('Refinamento')

    const button = screen.getByRole('button', {
      name: 'Excluir estado Rascunho',
    })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      'Defina outro estado como padrão antes de excluir este',
    )
  })

  it('blocks deleting the only state of a group', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()
    await screen.findByText('Refinamento')

    const button = screen.getByRole('button', {
      name: 'Excluir estado Execução',
    })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      'O grupo precisa manter ao menos um estado',
    )
  })

  it('allows deleting a state that has a sibling in its group', async () => {
    routeFetch({ [`GET ${URL}`]: () => apiSuccess(STATES) })
    renderList()
    await screen.findByText('Refinamento')

    expect(
      screen.getByRole('button', { name: 'Excluir estado Refinamento' }),
    ).toBeEnabled()
  })

  it('asks first, then DELETEs and says where the projects went', async () => {
    const spy = routeFetch({
      [`GET ${URL}`]: () => apiSuccess(STATES),
      [`DELETE ${URL}/pstate-extra`]: () =>
        apiSuccess({ movedTo: 'pstate-2', count: 2 }),
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Excluir estado Refinamento' }),
    )
    expect(requests(spy).some((r) => r.method === 'DELETE')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(requests(spy).some((r) => r.method === 'DELETE')).toBe(true),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message:
        'Estado excluído. 2 projetos foram movidos para outro estado do grupo',
    })
  })

  it('uses the singular for one moved project', async () => {
    routeFetch({
      [`GET ${URL}`]: () => apiSuccess(STATES),
      [`DELETE ${URL}/pstate-extra`]: () =>
        apiSuccess({ movedTo: 'pstate-2', count: 1 }),
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Excluir estado Refinamento' }),
    )
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect((await toastOutcome(vi.mocked(toast.promise))).message).toBe(
      'Estado excluído. 1 projeto foi movido para outro estado do grupo',
    )
  })

  it('does not mention movement when no project was in the state', async () => {
    routeFetch({
      [`GET ${URL}`]: () => apiSuccess(STATES),
      [`DELETE ${URL}/pstate-extra`]: () =>
        apiSuccess({ movedTo: 'pstate-2', count: 0 }),
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Excluir estado Refinamento' }),
    )
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect((await toastOutcome(vi.mocked(toast.promise))).message).toBe(
      'Estado excluído',
    )
  })

  it('surfaces the backend message when the delete is refused', async () => {
    routeFetch({
      [`GET ${URL}`]: () => apiSuccess(STATES),
      [`DELETE ${URL}/pstate-extra`]: () =>
        apiError(409, 'O grupo precisa manter ao menos um estado'),
    })
    const { user } = renderList()
    await screen.findByText('Refinamento')

    await user.click(
      screen.getByRole('button', { name: 'Excluir estado Refinamento' }),
    )
    await user.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'O grupo precisa manter ao menos um estado',
    })
  })
})
