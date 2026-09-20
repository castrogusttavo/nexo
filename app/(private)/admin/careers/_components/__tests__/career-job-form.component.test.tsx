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
import type { CareerJobDTO } from '@/types/career-job'
import { CareerJobForm } from '../career-job-form'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

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

// Settles the promise handed to the last `toast.promise` call and returns
// the message the user would actually see (success text or mapped error).
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

function buildJob(overrides: Partial<CareerJobDTO> = {}): CareerJobDTO {
  return {
    id: 'job-1',
    slug: 'engenheiro-backend',
    title: 'Engenheiro Backend',
    department: 'Engenharia',
    summary: 'Construa a plataforma do Nexo com a gente.',
    content: {
      about: 'Você vai trabalhar no núcleo da plataforma.',
      responsibilities: ['Desenhar APIs'],
      requirements: ['Node.js'],
      niceToHave: [],
      stack: ['TypeScript'],
    },
    location: 'São Paulo, SP',
    locationType: 'HYBRID',
    employmentType: 'CONTRACT',
    status: 'DRAFT',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// Each bullet list is a labelled group of item inputs.
function bulletField(label: string) {
  return within(screen.getByRole('group', { name: label }))
}

const locationTypeSelect = () =>
  screen.getByRole('combobox', { name: 'Tipo de localização' })
const employmentTypeSelect = () =>
  screen.getByRole('combobox', { name: 'Tipo de emprego' })

async function addBullet(
  user: ReturnType<typeof renderWithProviders>['user'],
  label: string,
  value: string,
) {
  await user.click(
    bulletField(label).getByRole('button', { name: 'Adicionar item' }),
  )
  const inputs = bulletField(label).getAllByRole('textbox')
  const last = inputs.at(-1)
  if (!last) throw new Error('No bullet input rendered')
  if (value) await user.type(last, value)
}

async function fillRequired(
  user: ReturnType<typeof renderWithProviders>['user'],
) {
  await user.type(screen.getByLabelText('Título'), 'Engenheira de Dados Pleno')
  await user.type(
    screen.getByLabelText('Resumo'),
    'Cuide dos pipelines de dados.',
  )
  await user.type(
    screen.getByLabelText('Sobre a vaga'),
    'Time pequeno e autônomo.',
  )
}

beforeEach(() => {
  push.mockReset()
})

describe('<CareerJobForm /> create mode', () => {
  it('posts the job with a slug derived from the title and navigates back', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildJob(), 201),
    )
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await addBullet(user, 'O que você vai fazer', 'Manter pipelines')
    await addBullet(user, 'O que buscamos', 'SQL avançado')
    await addBullet(user, 'Stack', 'Python')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/admin/careers')
    expect(method).toBe('POST')
    // Empty optional fields are sent as undefined, so they drop from JSON.
    expect(body).toEqual({
      slug: 'engenheira-de-dados-pleno',
      title: 'Engenheira de Dados Pleno',
      summary: 'Cuide dos pipelines de dados.',
      content: {
        about: 'Time pequeno e autônomo.',
        responsibilities: ['Manter pipelines'],
        requirements: ['SQL avançado'],
        niceToHave: [],
        stack: ['Python'],
      },
      locationType: 'ON_SITE',
      employmentType: 'FULL_TIME',
    })

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Vaga criada',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/careers'))
  })

  it('shows the pt-BR labels of the default types in the selects', () => {
    renderWithProviders(<CareerJobForm mode='create' />)

    expect(locationTypeSelect()).toHaveTextContent('Presencial')
    expect(locationTypeSelect()).not.toHaveTextContent('ON_SITE')
    expect(employmentTypeSelect()).toHaveTextContent('Tempo integral')
    expect(employmentTypeSelect()).not.toHaveTextContent('FULL_TIME')
  })

  it('transliterates accented letters into the derived slug', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await user.type(
      screen.getByLabelText('Título'),
      'Engenheira Sênior de Integrações',
    )
    await user.type(screen.getByLabelText('Resumo'), 'Resumo.')
    await user.type(screen.getByLabelText('Sobre a vaga'), 'Sobre.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body.slug).toBe(
      'engenheira-senior-de-integracoes',
    )
  })

  it('never derives a slug with an edge hyphen', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await user.type(screen.getByLabelText('Título'), ' -Dev ')
    await user.type(screen.getByLabelText('Resumo'), 'Resumo.')
    await user.type(screen.getByLabelText('Sobre a vaga'), 'Sobre.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body.slug).toBe('dev')
  })

  it('trims the hyphen a 50-character cut can leave behind', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    // 50 characters land exactly on the separator before "Brasil".
    await user.type(
      screen.getByLabelText('Título'),
      'Pessoa Engenheira de Software Backend Senior IIII Brasil',
    )
    await user.type(screen.getByLabelText('Resumo'), 'Resumo.')
    await user.type(screen.getByLabelText('Sobre a vaga'), 'Sobre.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const slug = getFetchCall(fetchSpy).body.slug
    expect(slug).toBe('pessoa-engenheira-de-software-backend-senior-iiii')
    expect(slug).not.toMatch(/-$/)
  })

  it('labels each bullet item input with its list', async () => {
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await addBullet(user, 'Stack', 'Go')

    expect(screen.getByLabelText('Stack 1')).toHaveValue('Go')
  })

  it('sends the location and employment types picked in the selects', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await user.click(locationTypeSelect())
    await user.click(await screen.findByRole('option', { name: 'Remoto' }))
    expect(locationTypeSelect()).toHaveTextContent('Remoto')
    await user.click(employmentTypeSelect())
    await user.click(await screen.findByRole('option', { name: 'Estágio' }))
    expect(employmentTypeSelect()).toHaveTextContent('Estágio')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toMatchObject({
      locationType: 'REMOTE',
      employmentType: 'INTERNSHIP',
    })
  })

  it('drops blank bullet items from the payload', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await addBullet(user, 'Stack', 'Go')
    await addBullet(user, 'Stack', '')
    await addBullet(user, 'Diferenciais', '')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { body } = getFetchCall(fetchSpy)
    expect(body.content.stack).toEqual(['Go'])
    expect(body.content.niceToHave).toEqual([])
  })

  it('removes the clicked bullet item, keeping the others intact', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await addBullet(user, 'Stack', 'React')
    await addBullet(user, 'Stack', 'Vue')
    await addBullet(user, 'Stack', 'Svelte')

    const removeButtons = bulletField('Stack').getAllByRole('button', {
      name: 'Remover',
    })
    await user.click(removeButtons[1])

    const values = bulletField('Stack')
      .getAllByRole('textbox')
      .map((input) => (input as HTMLInputElement).value)
    expect(values).toEqual(['React', 'Svelte'])

    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body.content.stack).toEqual([
      'React',
      'Svelte',
    ])
  })

  it('shows live character counters for summary and about', async () => {
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    expect(screen.getByText('0/700')).toBeInTheDocument()
    expect(screen.getByText('0/2000')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Resumo'), 'abcde')
    expect(screen.getByText('5/700')).toBeInTheDocument()
  })

  it('does not submit while required fields are empty', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('disables inputs and the submit button while saving', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await addBullet(user, 'Stack', 'Rust')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(),
    )
    expect(screen.getByLabelText('Título')).toBeDisabled()
    expect(screen.getByLabelText('Resumo')).toBeDisabled()
    for (const button of screen.getAllByRole('button', {
      name: 'Adicionar item',
    })) {
      expect(button).toBeDisabled()
    }
  })

  it('falls back to a generic message when the request fails outright', async () => {
    mockFetch().mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Não foi possível salvar a vaga',
    })
  })

  it('surfaces the backend error message and stays on the page', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Já existe uma vaga com esse slug', 'CONFLICT'),
    )
    const { user } = renderWithProviders(<CareerJobForm mode='create' />)

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Já existe uma vaga com esse slug',
    })
    expect(push).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled(),
    )
  })
})

describe('<CareerJobForm /> edit mode', () => {
  it('prefills every field from the initial job', () => {
    renderWithProviders(
      <CareerJobForm mode='edit' jobId='job-1' initial={buildJob()} />,
    )

    expect(screen.getByLabelText('Título')).toHaveValue('Engenheiro Backend')
    expect(screen.getByLabelText('Departamento')).toHaveValue('Engenharia')
    expect(screen.getByLabelText('Localização')).toHaveValue('São Paulo, SP')
    expect(locationTypeSelect()).toHaveTextContent('Híbrido')
    expect(employmentTypeSelect()).toHaveTextContent('PJ / Contrato')
    expect(
      bulletField('O que você vai fazer').getByRole('textbox'),
    ).toHaveValue('Desenhar APIs')
    expect(bulletField('Stack').getByRole('textbox')).toHaveValue('TypeScript')
  })

  it('patches the job and keeps the original slug even when the title changes', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(buildJob()))
    const { user } = renderWithProviders(
      <CareerJobForm mode='edit' jobId='job-1' initial={buildJob()} />,
    )

    const title = screen.getByLabelText('Título')
    await user.clear(title)
    await user.type(title, 'Engenheiro Backend Sênior')
    await user.clear(screen.getByLabelText('Departamento'))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/admin/careers/job-1')
    expect(method).toBe('PATCH')
    expect(body).toMatchObject({
      slug: 'engenheiro-backend',
      title: 'Engenheiro Backend Sênior',
      locationType: 'HYBRID',
      employmentType: 'CONTRACT',
      location: 'São Paulo, SP',
    })
    expect(body).not.toHaveProperty('department')

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Vaga atualizada',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/careers'))
  })
})
