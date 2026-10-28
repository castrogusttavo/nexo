import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MediaCoverImagePicker } from '../media-cover-image-picker'

// jsdom has no object URLs; the preview only needs a stable string.
URL.createObjectURL = () => 'blob:preview'
URL.revokeObjectURL = () => {}

function fileInput() {
  return screen.getByLabelText('Enviar capa') as HTMLInputElement
}

async function openUploadTab(onUpload = vi.fn().mockResolvedValue(undefined)) {
  // applyAccept off: the browser's picker filters by `accept`, but a drag or
  // a picker set to "all files" still hands the input any file.
  const user = userEvent.setup({ applyAccept: false })
  render(
    <MediaCoverImagePicker
      onSelect={vi.fn()}
      onUpload={onUpload}
      uploading={false}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Alterar capa' }))
  await user.click(await screen.findByRole('tab', { name: 'Upload' }))
  await screen.findByText('Arraste ou clique para enviar')
  return { user, onUpload }
}

const dropzone = () =>
  screen.getByRole('button', { name: 'Arraste ou clique para enviar' })

describe('<MediaCoverImagePicker /> upload', () => {
  it('opens the file picker when the dropzone is clicked', async () => {
    const { user } = await openUploadTab()
    const click = vi.spyOn(fileInput(), 'click')

    await user.click(dropzone())

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('ignores a picked file that is not an image', async () => {
    const { user, onUpload } = await openUploadTab()

    await user.upload(
      fileInput(),
      new File(['doc'], 'notes.txt', { type: 'text/plain' }),
    )

    expect(onUpload).not.toHaveBeenCalled()
    expect(document.querySelector('img[src="blob:preview"]')).toBeNull()
    expect(
      screen.getByText('Arraste ou clique para enviar'),
    ).toBeInTheDocument()
  })

  it('does nothing when the picker is closed without a file', async () => {
    const { onUpload } = await openUploadTab()

    fireEvent.change(fileInput(), { target: { files: [] } })

    expect(onUpload).not.toHaveBeenCalled()
  })

  it('previews and uploads a picked image', async () => {
    const { user, onUpload } = await openUploadTab()
    const file = new File(['png'], 'cover.png', { type: 'image/png' })

    await user.upload(fileInput(), file)

    expect(onUpload).toHaveBeenCalledWith(file)
    expect(document.querySelector('img[src="blob:preview"]')).toBeTruthy()
  })
})
