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
import { UserCoverImagePicker } from '../user-modal-coverimage-dialog'

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

async function openPicker(currentImage?: string | null) {
  const utils = renderWithProviders(
    <UserCoverImagePicker currentImage={currentImage} />,
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

async function openUploadTab() {
  const utils = await openPicker()
  await utils.user.click(screen.getByRole('tab', { name: 'Upload' }))
  await screen.findByText('Arraste ou clique para enviar')
  return utils
}

const PNG = () => new File(['png'], 'cover.png', { type: 'image/png' })

beforeEach(() => {
  vi.mocked(toast.promise).mockClear()
})

describe('<UserCoverImagePicker /> gallery', () => {
  it('lists every bundled cover image', async () => {
    await openPicker()

    expect(document.querySelectorAll('img[src^="/coverImages/"]')).toHaveLength(
      COVER_IMAGES.length,
    )
  })

  it('highlights the cover already in use', async () => {
    await openPicker(COVER_IMAGES[1])

    // jsdom drops `hsl(var(--primary))` as an unparsable value, so the check
    // is "the selected one is not the transparent default".
    expect(coverButton(COVER_IMAGES[0]).style.borderColor).toBe('transparent')
    expect(coverButton(COVER_IMAGES[1]).style.borderColor).not.toBe(
      'transparent',
    )
  })

  it('patches the profile with the chosen cover', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ coverImage: COVER_IMAGES[2] }),
    )
    const { user } = await openPicker()

    await user.click(coverButton(COVER_IMAGES[2]))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me',
      method: 'PATCH',
      body: { coverImage: COVER_IMAGES[2] },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Capa atualizada',
    })
  })

  it('locks the gallery while the update is in flight', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = await openPicker()

    await user.click(coverButton(COVER_IMAGES[0]))

    await waitFor(() => expect(coverButton(COVER_IMAGES[0])).toBeDisabled())
    expect(coverButton(COVER_IMAGES[1])).toBeDisabled()
  })

  it('reports a failed pick through the toast and stays usable', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    mockFetch().mockResolvedValueOnce(apiError(403, 'Capa não permitida'))
    const { user } = await openPicker()

    await user.click(coverButton(COVER_IMAGES[0]))

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Capa não permitida',
    })
    // The click handler discards the promise, so the rejection has to be
    // swallowed inside the component instead of reaching the process.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(unhandled).not.toHaveBeenCalled()
    process.off('unhandledRejection', unhandled)

    await waitFor(() => expect(coverButton(COVER_IMAGES[0])).toBeEnabled())
  })
})

describe('<UserCoverImagePicker /> upload', () => {
  it('uploads the picked file as multipart form data and previews it', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ url: 'https://cdn.example.com/cover.png' }),
    )
    const { user } = await openUploadTab()

    const file = PNG()
    await user.upload(fileInput(), file)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/users/me/cover')
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('cover')).toBe(file)
    expect(document.querySelector('img[src="blob:preview"]')).toBeTruthy()
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Capa atualizada',
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
    mockFetch().mockResolvedValueOnce(apiError(413, 'Arquivo muito grande'))
    const { user } = await openUploadTab()

    await user.upload(fileInput(), PNG())

    expect(await screen.findByText('Arquivo muito grande')).toBeInTheDocument()
    expect(document.querySelector('img[src="blob:preview"]')).toBeNull()
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
    expect((getFetchCall(fetchSpy).body as FormData).get('cover')).toBe(file)
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
