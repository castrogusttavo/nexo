import { fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COVER_IMAGES } from '@/app/_components/media/cover-images'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { CoverImagePicker } from '../workspace-project-modal-coverimage-dialog'

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

// jsdom has no object URLs; the preview only needs a stable string.
URL.createObjectURL = () => 'blob:preview'

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

async function openPicker(
  props: { currentImage?: string; onSelect?: (url: string) => void } = {},
) {
  const utils = renderWithProviders(
    <CoverImagePicker workspaceId='ws-1' {...props} />,
  )
  await utils.user.click(screen.getByRole('button', { name: 'Alterar capa' }))
  await screen.findByRole('tab', { name: 'Imagens' })
  return utils
}

/** The gallery buttons have no label; find them by the thumbnail they wrap. */
function coverButton(src: string) {
  const image = document.querySelector(`img[src="${src}"]`)
  const button = image?.closest('button')
  if (!button) throw new Error(`No cover button for ${src}`)
  return button
}

function fileInput() {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('No file input')
  return input
}

const dropzone = () =>
  screen.getByRole('button', { name: 'Arraste ou clique para enviar' })

async function openUploadTab(onSelect?: (url: string) => void) {
  const utils = await openPicker({ onSelect })
  await utils.user.click(screen.getByRole('tab', { name: 'Upload' }))
  await screen.findByText('Arraste ou clique para enviar')
  return utils
}

const PNG = () => new File(['png'], 'cover.png', { type: 'image/png' })

beforeEach(() => {
  vi.mocked(toast.promise).mockClear()
})

describe('<CoverImagePicker /> gallery', () => {
  it('lists every bundled cover image', async () => {
    await openPicker()

    expect(document.querySelectorAll('img[src^="/coverImages/"]')).toHaveLength(
      COVER_IMAGES.length,
    )
  })

  it('highlights the cover already in use', async () => {
    await openPicker({ currentImage: COVER_IMAGES[3] })

    // jsdom drops `hsl(var(--primary))` as an unparsable value, so the check
    // is "the selected one is not the transparent default".
    expect(coverButton(COVER_IMAGES[0]).style.borderColor).toBe('transparent')
    expect(coverButton(COVER_IMAGES[3]).style.borderColor).not.toBe(
      'transparent',
    )
  })

  it('reports the chosen cover to the parent without any request', async () => {
    const onSelect = vi.fn()
    const fetchSpy = mockFetch()
    const { user } = await openPicker({ onSelect })

    await user.click(coverButton(COVER_IMAGES[2]))

    expect(onSelect).toHaveBeenCalledWith(COVER_IMAGES[2])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('tolerates a selection with no handler attached', async () => {
    const { user } = await openPicker()

    await user.click(coverButton(COVER_IMAGES[0]))

    expect(coverButton(COVER_IMAGES[0])).toBeInTheDocument()
  })
})

describe('<CoverImagePicker /> upload', () => {
  it('uploads the picked file and hands the stored url to the parent', async () => {
    const onSelect = vi.fn()
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ url: 'https://cdn.example.com/cover.png' }),
    )
    const { user } = await openUploadTab(onSelect)

    const file = PNG()
    await user.upload(fileInput(), file)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/workspaces/ws-1/projects/cover-image')
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect(document.querySelector('img[src="blob:preview"]')).toBeTruthy()
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        'https://cdn.example.com/cover.png',
      ),
    )
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Imagem enviada',
    })
  })

  it('ignores a file that is not an image', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openUploadTab()

    await user.upload(
      fileInput(),
      new File(['doc'], 'notes.txt', { type: 'text/plain' }),
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.querySelector('img[src="blob:preview"]')).toBeNull()
  })

  it('drops the preview and shows the reason when the upload fails', async () => {
    const onSelect = vi.fn()
    mockFetch().mockResolvedValueOnce(apiError(413, 'Arquivo muito grande'))
    const { user } = await openUploadTab(onSelect)

    await user.upload(fileInput(), PNG())

    expect(await screen.findByText('Arquivo muito grande')).toBeInTheDocument()
    expect(document.querySelector('img[src="blob:preview"]')).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Arquivo muito grande',
    })
  })

  it('uploads a file dropped on the dropzone', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ url: 'https://cdn.example.com/cover.png' }),
    )
    await openUploadTab()

    const file = PNG()
    fireEvent.dragOver(dropzone())
    fireEvent.drop(dropzone(), { dataTransfer: { files: [file] } })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect((getFetchCall(fetchSpy).body as FormData).get('file')).toBe(file)
  })

  it('ignores a drop that carries no file', async () => {
    const fetchSpy = mockFetch()
    await openUploadTab()

    fireEvent.dragOver(dropzone())
    fireEvent.dragLeave(dropzone())
    fireEvent.drop(dropzone(), { dataTransfer: { files: [] } })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('disables the dropzone while the upload runs', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = await openUploadTab()

    await user.upload(fileInput(), PNG())

    await waitFor(() =>
      expect(
        document.querySelector('img[src="blob:preview"]')?.closest('button'),
      ).toBeDisabled(),
    )
  })
})
