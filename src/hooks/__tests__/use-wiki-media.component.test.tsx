import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WikiEditorProvider } from '../use-wiki-editor-context'
import { useUploadWikiMedia } from '../use-wiki-media'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError } }))

/**
 * Minimal controllable stand-in for XMLHttpRequest: records what the hook
 * opens and sends, and lets the test drive progress / load / error events.
 */
class FakeXhr {
  static instances: FakeXhr[] = []

  method?: string
  url?: string
  body?: unknown
  status = 0
  responseText = ''
  upload: { onprogress: ((event: Partial<ProgressEvent>) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    FakeXhr.instances.push(this)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  send(body: unknown) {
    this.body = body
  }

  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable })
  }

  respond(status: number, body: unknown) {
    this.status = status
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
    this.onload?.()
  }

  fail() {
    this.onerror?.()
  }
}

function lastXhr() {
  const xhr = FakeXhr.instances.at(-1)
  if (!xhr) throw new Error('No XMLHttpRequest was created')
  return xhr
}

function renderUploadHook() {
  return renderHook(() => useUploadWikiMedia(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <WikiEditorProvider
        workspaceId='ws-1'
        wikiPageId='page-1'
        userId='user-1'
        userName='Ana'
      >
        {children}
      </WikiEditorProvider>
    ),
  })
}

function buildFile() {
  return new File(['png'], 'diagram.png', { type: 'image/png' })
}

beforeEach(() => {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useUploadWikiMedia', () => {
  it('starts idle', () => {
    const { result } = renderUploadHook()

    expect(result.current).toMatchObject({
      isUploading: false,
      progress: 0,
      uploadedFile: undefined,
      uploadingFile: undefined,
    })
  })

  it('POSTs the file as form data to the workspace wiki media route', async () => {
    const file = buildFile()
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(file)
    })

    const xhr = lastXhr()
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('/api/workspaces/ws-1/wiki/media')
    expect(xhr.body).toBeInstanceOf(FormData)
    expect((xhr.body as FormData).get('file')).toBe(file)

    await act(async () => {
      xhr.respond(201, { success: true, data: { key: 'k', url: 'u' } })
      await upload
    })
  })

  it('tracks the in-flight file and progress, then resets and stores the upload', async () => {
    const file = buildFile()
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(file)
    })
    const xhr = lastXhr()

    expect(result.current.isUploading).toBe(true)
    expect(result.current.uploadingFile).toBe(file)

    act(() => xhr.progress(1, 3))
    expect(result.current.progress).toBe(33)

    // A non-computable length must not move the progress bar.
    act(() => xhr.progress(3, 0, false))
    expect(result.current.progress).toBe(33)

    let returned: unknown
    await act(async () => {
      xhr.respond(201, {
        success: true,
        data: { key: 'wiki/diagram.png', url: 'https://x/diagram.png' },
      })
      returned = await upload
    })

    const expected = {
      key: 'wiki/diagram.png',
      url: 'https://x/diagram.png',
      name: 'diagram.png',
    }
    expect(returned).toEqual(expected)
    expect(result.current).toMatchObject({
      isUploading: false,
      progress: 0,
      uploadingFile: undefined,
      uploadedFile: expected,
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('toasts and rethrows the backend message on an error status', async () => {
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(buildFile())
    })

    await act(async () => {
      lastXhr().respond(413, {
        success: false,
        message: 'Arquivo muito grande',
      })
      await expect(upload).rejects.toThrow('Arquivo muito grande')
    })

    expect(toastError).toHaveBeenCalledWith('Arquivo muito grande')
    expect(result.current).toMatchObject({
      isUploading: false,
      progress: 0,
      uploadingFile: undefined,
      uploadedFile: undefined,
    })
  })

  it('falls back to the hook message when the error body is not JSON', async () => {
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(buildFile())
    })

    await act(async () => {
      lastXhr().respond(502, '<html>Bad Gateway</html>')
      await expect(upload).rejects.toThrow('Erro ao enviar arquivo')
    })

    expect(toastError).toHaveBeenCalledWith('Erro ao enviar arquivo')
  })

  it('rejects a 2xx response that carries no data', async () => {
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(buildFile())
    })

    await act(async () => {
      lastXhr().respond(200, { success: true })
      await expect(upload).rejects.toThrow('Erro ao enviar arquivo')
    })

    expect(result.current.uploadedFile).toBeUndefined()
  })

  it('toasts the fallback message on a network error', async () => {
    const { result } = renderUploadHook()

    let upload: Promise<unknown> = Promise.resolve()
    act(() => {
      upload = result.current.uploadFile(buildFile())
    })

    await act(async () => {
      lastXhr().fail()
      await expect(upload).rejects.toThrow('Erro ao enviar arquivo')
    })

    expect(toastError).toHaveBeenCalledWith('Erro ao enviar arquivo')
    expect(result.current.isUploading).toBe(false)
  })

  it('throws when used outside the wiki editor provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useUploadWikiMedia())).toThrow(
      'useWikiEditorContext deve ser usado dentro de WikiEditorProvider',
    )
  })
})
