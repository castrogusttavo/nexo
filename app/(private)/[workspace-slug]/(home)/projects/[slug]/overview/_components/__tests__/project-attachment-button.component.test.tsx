import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { MAX_ATTACHMENT_BYTES } from '@/src/lib/attachment-limits'
import { ProjectAttachmentButton } from '../project-attachment-button'

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

const BASE = '/api/workspaces/ws-1/projects/alpha/attachments'

const attachment = {
  id: 'a1',
  projectId: 'p1',
  fileName: 'plano.pdf',
  contentType: 'application/pdf',
  size: 4,
  url: 'https://signed',
  uploadedById: 'u1',
  createdAt: '2026-11-18T10:00:00.000Z',
}

function renderButton() {
  const utils = renderWithProviders(
    <ProjectAttachmentButton workspaceId='ws-1' projectSlug='alpha' />,
  )
  const input = screen.getByTestId('project-attachment-input')
  return { ...utils, input: input as HTMLInputElement }
}

function pdf(name = 'plano.pdf') {
  return new File(['%PDF'], name, { type: 'application/pdf' })
}

describe('<ProjectAttachmentButton />', () => {
  it('opens the file picker straight from the button', async () => {
    const { user, input } = renderButton()
    const click = vi.spyOn(input, 'click')

    await user.click(screen.getByRole('button', { name: 'Anexar arquivo' }))

    expect(click).toHaveBeenCalledOnce()
  })

  it('only offers the types the server accepts, several at a time', () => {
    const { input } = renderButton()

    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('multiple')
    expect(input.accept).toContain('application/pdf')
    expect(input.accept).toContain('image/png')
    expect(input.accept).not.toContain('application/x-msdownload')
  })

  it('uploads the chosen file as multipart form data', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(attachment, 201))
    const { user, input } = renderButton()

    await user.upload(input, pdf())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const call = getFetchCall(fetchSpy)
    expect(call).toMatchObject({ url: BASE, method: 'POST' })
    const sent = (call.body as FormData).get('file') as File
    expect(sent.name).toBe('plano.pdf')
    expect(sent.type).toBe('application/pdf')
  })

  it('uploads each file when several are chosen', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(attachment, 201))
    const { user, input } = renderButton()

    await user.upload(input, [pdf('a.pdf'), pdf('b.pdf')])

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })

  it('rejects a disallowed type without sending anything', async () => {
    const fetchSpy = mockFetch()
    const { input } = renderButton()
    const exe = new File(['MZ'], 'virus.exe', {
      type: 'application/x-msdownload',
    })

    // `user.upload` honours `accept`; fireEvent-style change bypasses it, which
    // is exactly what a drag-and-drop or a renamed file would do.
    Object.defineProperty(input, 'files', { value: [exe], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '"virus.exe": tipo de arquivo não permitido',
      ),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an empty file', async () => {
    const fetchSpy = mockFetch()
    const { user, input } = renderButton()

    await user.upload(
      input,
      new File([], 'vazio.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '"vazio.pdf": o arquivo está vazio',
      ),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a file over the size limit', async () => {
    const fetchSpy = mockFetch()
    const { user, input } = renderButton()
    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: MAX_ATTACHMENT_BYTES + 1 })

    await user.upload(input, big)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('"grande.pdf" tem 25 MB'),
      ),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears the input so the same file can be chosen again', async () => {
    mockFetch().mockResolvedValue(apiSuccess(attachment, 201))
    const { user, input } = renderButton()

    await user.upload(input, pdf())

    await waitFor(() => expect(input.value).toBe(''))
  })
})
