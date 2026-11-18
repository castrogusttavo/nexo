import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectStateGroupMeta } from '@/app/_components/workspace/project/project-state-groups'
import { buildProjectStateDTO } from '@/src/__tests__/factories/dto/project-state.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WorkspaceSettingsProjectStateForm } from '../workspace-settings-project-state-form'
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
const onClose = vi.fn()

const nameInput = () => screen.getByLabelText('Nome do estado')
const descriptionInput = () => screen.getByLabelText('Descrição do estado')
const submit = (label: string) => screen.getByRole('button', { name: label })

beforeEach(() => {
  onClose.mockReset()
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectStateForm /> creating', () => {
  function renderCreate(
    group: 'DRAFT' | 'PLANNING' | 'CANCELLED' = 'PLANNING',
  ) {
    return renderWithProviders(
      <WorkspaceSettingsProjectStateForm
        workspaceId='ws-1'
        group={group}
        onClose={onClose}
      />,
    )
  }

  it('starts empty and cannot be submitted', () => {
    renderCreate()

    expect(nameInput()).toHaveValue('')
    expect(submit('Criar')).toBeDisabled()
  })

  it('stays disabled for a name that is only whitespace', async () => {
    const { user } = renderCreate()

    await user.type(nameInput(), '   ')

    expect(submit('Criar')).toBeDisabled()
  })

  it('POSTs the name, the group and the group default colour', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () =>
        apiSuccess(buildProjectStateDTO({ name: 'Revisão' }), 201),
    })
    const { user } = renderCreate('PLANNING')

    await user.type(nameInput(), '  Revisão  ')
    await user.click(submit('Criar'))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(requests(spy)[0]).toEqual({
      url: URL,
      method: 'POST',
      body: {
        name: 'Revisão',
        group: 'PLANNING',
        color: projectStateGroupMeta.PLANNING.defaultColor,
      },
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estado criado',
    })
  })

  it('starts from the colour of the group it is created in', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () => apiSuccess(buildProjectStateDTO(), 201),
    })
    const { user } = renderCreate('CANCELLED')

    await user.type(nameInput(), 'Arquivado')
    await user.click(submit('Criar'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0].body).toMatchObject({
      color: projectStateGroupMeta.CANCELLED.defaultColor,
    })
  })

  it('sends the description only when there is one', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () => apiSuccess(buildProjectStateDTO(), 201),
    })
    const { user } = renderCreate()

    await user.type(nameInput(), 'Revisão')
    await user.type(descriptionInput(), ' Aguardando o time ')
    await user.click(submit('Criar'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0].body).toMatchObject({
      description: 'Aguardando o time',
    })
  })

  it('sends the colour picked in the swatch popover', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () => apiSuccess(buildProjectStateDTO(), 201),
    })
    const { user } = renderCreate()

    await user.click(screen.getByRole('button', { name: 'Escolher cor' }))
    await user.click(await screen.findByRole('button', { name: 'Vermelho' }))
    await user.type(nameInput(), 'Bloqueado')
    await user.click(submit('Criar'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0].body).toMatchObject({ color: 'RED' })
  })

  it('surfaces the backend message and stays open when it fails', async () => {
    routeFetch({
      [`POST ${URL}`]: () =>
        apiError(422, 'Nome deve ter ao menos 1 caractere'),
    })
    const { user } = renderCreate()

    await user.type(nameInput(), 'Revisão')
    await user.click(submit('Criar'))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Nome deve ter ao menos 1 caractere',
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes without a request when cancelled', async () => {
    const spy = routeFetch({})
    const { user } = renderCreate()

    await user.type(nameInput(), 'Revisão')
    await user.click(submit('Cancelar'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('<WorkspaceSettingsProjectStateForm /> editing', () => {
  const state = buildProjectStateDTO({
    id: 'pstate-9',
    name: 'Planejamento',
    description: 'Antes de começar',
    group: 'PLANNING',
    color: 'BLUE',
    isDefault: false,
  })

  it('starts from the state', () => {
    renderWithProviders(
      <WorkspaceSettingsProjectStateForm
        workspaceId='ws-1'
        state={state}
        onClose={onClose}
      />,
    )

    expect(nameInput()).toHaveValue('Planejamento')
    expect(descriptionInput()).toHaveValue('Antes de começar')
    expect(submit('Salvar')).toBeEnabled()
  })

  it('PATCHes the changes to the state url, without a group', async () => {
    const spy = routeFetch({
      [`PATCH ${URL}/pstate-9`]: () => apiSuccess(state),
    })
    const { user } = renderWithProviders(
      <WorkspaceSettingsProjectStateForm
        workspaceId='ws-1'
        state={state}
        onClose={onClose}
      />,
    )

    await user.clear(nameInput())
    await user.type(nameInput(), 'Preparação')
    await user.click(submit('Salvar'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0]).toEqual({
      url: `${URL}/pstate-9`,
      method: 'PATCH',
      body: {
        name: 'Preparação',
        description: 'Antes de começar',
        color: 'BLUE',
      },
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estado atualizado',
    })
  })

  it('sends an empty description to clear it', async () => {
    const spy = routeFetch({
      [`PATCH ${URL}/pstate-9`]: () => apiSuccess(state),
    })
    const { user } = renderWithProviders(
      <WorkspaceSettingsProjectStateForm
        workspaceId='ws-1'
        state={state}
        onClose={onClose}
      />,
    )

    await user.clear(descriptionInput())
    await user.click(submit('Salvar'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0].body).toMatchObject({ description: '' })
  })
})
