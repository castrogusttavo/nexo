import { screen, waitFor } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { COVER_IMAGES } from '@/app/_components/media/cover-images'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WorkspaceProjectModal } from '../workspace-project-modal-create'

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

// next/image needs the Next runtime loader; a plain <img> is enough here.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

// The pickers are rich dropdowns (emoji catalogue, uploads) with their own
// concerns; stub them down to a button that reports a fixed selection.
vi.mock('../workspace-project-modal-emoji-icon-dialog', () => ({
  EmojiIconPicker: ({ onSelect }: { onSelect?: (emoji: string) => void }) => (
    <button type='button' onClick={() => onSelect?.('🚀')}>
      Escolher emoji
    </button>
  ),
}))
vi.mock('../workspace-project-modal-coverimage-dialog', () => ({
  CoverImagePicker: ({ onSelect }: { onSelect?: (url: string) => void }) => (
    <button type='button' onClick={() => onSelect?.('/coverImages/custom.jpg')}>
      Alterar capa
    </button>
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

const PROJECT = {
  id: 'project-1',
  name: 'Projeto',
  slug: 'projeto',
}

async function openModal() {
  const utils = renderWithProviders(
    <WorkspaceProjectModal workspaceId='ws-1' />,
  )
  await utils.user.click(
    screen.getByRole('button', { name: 'Adicionar projeto' }),
  )
  await screen.findByRole('dialog')
  return utils
}

const nameInput = () => screen.getByPlaceholderText('Nome do projeto')
const slugInput = () => screen.getByPlaceholderText('ID do projeto')
const submitButton = () => screen.getByRole('button', { name: 'Criar projeto' })

describe('<WorkspaceProjectModal />', () => {
  it('keeps the submit button disabled until a name is typed', async () => {
    const { user } = await openModal()

    expect(submitButton()).toBeDisabled()
    await user.type(nameInput(), 'Roadmap')
    expect(submitButton()).toBeEnabled()
  })

  it('derives an accent-free slug from the project name', async () => {
    const { user } = await openModal()

    await user.type(nameInput(), '  Café & Operações 2026!  ')

    expect(slugInput()).toHaveValue('cafe-operacoes-2026')
  })

  it('caps the derived slug at 50 characters', async () => {
    const { user } = await openModal()

    await user.type(nameInput(), 'a'.repeat(60))

    expect(slugInput()).toHaveValue('a'.repeat(50))
  })

  it('posts the draft with defaults and closes on success', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(PROJECT, 201))
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap Q3')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces/ws-1/projects')
    expect(method).toBe('POST')
    // Empty description is omitted rather than sent as ''.
    expect(body).toEqual({
      name: 'Roadmap Q3',
      slug: 'roadmap-q3',
      emoji: '😊',
      coverImage: expect.any(String),
      isPublic: false,
    })
    expect(COVER_IMAGES).toContain(body.coverImage)

    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Projeto criado',
    })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('sends the edited slug, description, picked emoji/cover and public visibility', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(PROJECT, 201))
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap')
    await user.clear(slugInput())
    await user.type(slugInput(), 'rm')
    await user.type(screen.getByPlaceholderText('Descrição'), 'Planejamento')
    await user.click(screen.getByRole('button', { name: 'Escolher emoji' }))
    await user.click(screen.getByRole('button', { name: 'Alterar capa' }))

    await user.click(screen.getByRole('button', { name: 'Privado' }))
    await user.click(
      await screen.findByRole('menuitemradio', { name: /Público/ }),
    )
    expect(screen.getByRole('button', { name: 'Público' })).toBeInTheDocument()

    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body).toEqual({
      name: 'Roadmap',
      slug: 'rm',
      description: 'Planejamento',
      emoji: '🚀',
      coverImage: '/coverImages/custom.jpg',
      isPublic: true,
    })
  })

  it('disables submit when the slug is cleared', async () => {
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap')
    await user.clear(slugInput())

    expect(submitButton()).toBeDisabled()
  })

  it('disables submit while the request is pending', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap')
    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
  })

  it('shows the backend error inline and keeps the dialog open', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Já existe um projeto com esse ID', 'CONFLICT'),
    )
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap')
    await user.click(submitButton())

    expect(
      await screen.findByText('Já existe um projeto com esse ID'),
    ).toBeInTheDocument()
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Já existe um projeto com esse ID',
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('Roadmap')
  })

  it('resets the draft and the error when cancelled and reopened', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Falha inesperada'))
    const { user } = await openModal()

    await user.type(nameInput(), 'Roadmap')
    await user.click(submitButton())
    await screen.findByText('Falha inesperada')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Adicionar projeto' }))
    await screen.findByRole('dialog')
    expect(nameInput()).toHaveValue('')
    expect(slugInput()).toHaveValue('')
    expect(screen.queryByText('Falha inesperada')).not.toBeInTheDocument()
  })
})
