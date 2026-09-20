import { fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import CreateWorkspacePage from '../page'

const { push, back, useSession } = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
}))

// next/image needs the Next image loader; the logo only has to be findable.
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}))

vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession },
}))

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

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}): WorkspaceDTO {
  return {
    id: 'ws-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    activePlan: 'FREE',
    trialEndsAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const nameInput = () => screen.getByLabelText('Nome do seu workspace')
const slugInput = () => screen.getByLabelText('Defina o URL do seu workspace')
const submitButton = () =>
  screen.getByRole('button', { name: 'Criar workspace' })

/** Native implicit submission (Enter inside a field). */
function submitWithEnter() {
  const form = nameInput().closest('form')
  if (!form) throw new Error('No form around the name field')
  fireEvent.submit(form)
}

function renderPage() {
  return renderWithProviders(<CreateWorkspacePage />)
}

beforeEach(() => {
  push.mockReset()
  back.mockReset()
  useSession.mockReturnValue({
    data: { user: { id: 'user-1', email: 'ana@nexo.dev' } },
    isPending: false,
  })
})

describe('<CreateWorkspacePage /> form', () => {
  it('renders the branding, the signed-in email and empty fields', () => {
    renderPage()

    expect(screen.getByText('nexo-logo')).toBeInTheDocument()
    expect(screen.getByText('ana@nexo.dev')).toBeInTheDocument()
    expect(screen.getByText('Crie seu workspace')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
    expect(slugInput()).toHaveValue('')
    expect(screen.getByText('nexopm.com/')).toBeInTheDocument()
  })

  it('renders without an email when the session is still empty', () => {
    useSession.mockReturnValue({ data: null, isPending: true })
    renderPage()

    expect(screen.queryByText('ana@nexo.dev')).not.toBeInTheDocument()
  })

  it('derives the slug from the name, stripping accents and punctuation', async () => {
    const { user } = renderPage()

    await user.type(nameInput(), 'Ação & Café!')

    expect(slugInput()).toHaveValue('acao-cafe')
  })

  it('stops following the name once the slug is edited by hand', async () => {
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.paste('outra-coisa')
    await user.type(nameInput(), ' Corp')

    expect(nameInput()).toHaveValue('Acme Corp')
    expect(slugInput()).toHaveValue('outra-coisa')
  })

  it('normalizes a pasted slug', async () => {
    const { user } = renderPage()

    await user.click(slugInput())
    await user.paste('Minha Empresa')

    expect(slugInput()).toHaveValue('minha-empresa')
  })

  it('keeps the separators typed one keystroke at a time', async () => {
    const { user } = renderPage()

    await user.type(slugInput(), 'Minha Empresa')

    // The hyphen a space produces survives until the next character, so the
    // words stay apart instead of running together.
    expect(slugInput()).toHaveValue('minha-empresa')
  })

  it('submits the slug without its dangling hyphen', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme')
    await user.clear(slugInput())
    await user.type(slugInput(), 'minha empresa ')
    expect(slugInput()).toHaveValue('minha-empresa-')

    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toMatchObject({
      slug: 'minha-empresa',
    })
  })

  it('labels the team-size select and sends the pick to the API', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderPage()

    expect(
      screen.getByLabelText('Quantas pessoas usarão este espaço de trabalho?'),
    ).toBe(screen.getByRole('combobox'))

    await user.type(nameInput(), 'Acme Corp')
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '2-10' }))
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({
      name: 'Acme Corp',
      slug: 'acme-corp',
      teamSize: '2-10',
    })
  })

  it('omits the team size when none is picked', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme Corp')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({
      name: 'Acme Corp',
      slug: 'acme-corp',
    })
  })
})

describe('<CreateWorkspacePage /> submission', () => {
  it('explains why a too-short form cannot be sent instead of ignoring the click', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderPage()

    await user.type(nameInput(), 'A')
    await user.click(submitButton())

    expect(
      await screen.findByText('Nome deve ter ao menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('creates the workspace and navigates to it', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace({ slug: 'acme-corp' })),
    )
    const { user } = renderPage()

    await user.type(nameInput(), '  Acme Corp  ')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces')
    expect(method).toBe('POST')
    // The name is trimmed, the slug keeps what the field showed.
    expect(body).toEqual({ name: 'Acme Corp', slug: 'acme-corp' })

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Workspace criado',
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/acme-corp'))
  })

  it('reports both field errors when the form is submitted with Enter', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderPage()

    await user.type(nameInput(), 'a')
    submitWithEnter()

    expect(
      await screen.findByText('Nome deve ter ao menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Slug deve ter ao menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an empty slug with the character-set message', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme Corp')
    await user.clear(slugInput())
    submitWithEnter()

    expect(
      await screen.findByText(
        'Slug deve conter apenas letras minúsculas, números e hífens',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Nome deve ter ao menos 2 caracteres'),
    ).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears a previous error on the next submission', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderPage()

    await user.type(nameInput(), 'a')
    submitWithEnter()
    await screen.findByText('Nome deve ter ao menos 2 caracteres')

    await user.type(nameInput(), 'cme')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(
      screen.queryByText('Nome deve ter ao menos 2 caracteres'),
    ).not.toBeInTheDocument()
  })

  it('disables the fields while the request is in flight', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme Corp')
    await user.click(submitButton())

    await waitFor(() => expect(nameInput()).toBeDisabled())
    expect(slugInput()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled()
  })

  it('keeps the user on the page when the API rejects the slug', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Esse slug já está em uso', 'CONFLICT'),
    )
    const { user } = renderPage()

    await user.type(nameInput(), 'Acme Corp')
    await user.click(submitButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Esse slug já está em uso',
    })
    expect(push).not.toHaveBeenCalled()
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })
})

describe('<CreateWorkspacePage /> navigation', () => {
  it('goes back in history', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(back).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })
})
