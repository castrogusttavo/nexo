import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectLabelDTO } from '@/src/__tests__/factories/dto/project-label.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WorkspaceSettingsProjectLabelForm } from '../workspace-settings-project-label-form'
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
const onClose = vi.fn()

const nameInput = () => screen.getByLabelText('Título da etiqueta')

beforeEach(() => {
  onClose.mockReset()
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectLabelForm /> creating', () => {
  function renderCreate() {
    return renderWithProviders(
      <WorkspaceSettingsProjectLabelForm
        workspaceId='ws-1'
        onClose={onClose}
      />,
    )
  }

  it('starts empty and cannot be submitted', () => {
    renderCreate()

    expect(nameInput()).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
  })

  it('POSTs the trimmed name with the default colour', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () => apiSuccess(buildProjectLabelDTO(), 201),
    })
    const { user } = renderCreate()

    await user.type(nameInput(), '  Q4  ')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(requests(spy)[0]).toEqual({
      url: URL,
      method: 'POST',
      body: { name: 'Q4', color: 'ZINC' },
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Etiqueta criada',
    })
  })

  it('sends the colour picked in the swatch popover', async () => {
    const spy = routeFetch({
      [`POST ${URL}`]: () => apiSuccess(buildProjectLabelDTO(), 201),
    })
    const { user } = renderCreate()

    await user.click(screen.getByRole('button', { name: 'Escolher cor' }))
    await user.click(await screen.findByRole('button', { name: 'Verde' }))
    await user.type(nameInput(), 'Q4')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0].body).toMatchObject({ color: 'GREEN' })
  })

  it('surfaces the backend message and stays open when it fails', async () => {
    routeFetch({
      [`POST ${URL}`]: () =>
        apiError(409, 'Já existe uma etiqueta com esse nome'),
    })
    const { user } = renderCreate()

    await user.type(nameInput(), 'Q4')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Já existe uma etiqueta com esse nome',
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes without a request when cancelled', async () => {
    const spy = routeFetch({})
    const { user } = renderCreate()

    await user.type(nameInput(), 'Q4')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('<WorkspaceSettingsProjectLabelForm /> editing', () => {
  const label = buildProjectLabelDTO({
    id: 'plabel-7',
    name: 'Marketing',
    color: 'PURPLE',
  })

  it('starts from the label and PATCHes the changes', async () => {
    const spy = routeFetch({
      [`PATCH ${URL}/plabel-7`]: () => apiSuccess(label),
    })
    const { user } = renderWithProviders(
      <WorkspaceSettingsProjectLabelForm
        workspaceId='ws-1'
        label={label}
        onClose={onClose}
      />,
    )
    expect(nameInput()).toHaveValue('Marketing')

    await user.clear(nameInput())
    await user.type(nameInput(), 'Growth')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(requests(spy)[0]).toEqual({
      url: `${URL}/plabel-7`,
      method: 'PATCH',
      body: { name: 'Growth', color: 'PURPLE' },
    })
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Etiqueta atualizada',
    })
  })
})
