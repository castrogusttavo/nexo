import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { AttachmentDTO } from '@/types/attachment'
import {
  useAttachments,
  useRemoveAttachment,
  useUploadAttachment,
} from '../use-attachment'

const BASE_URL = '/api/workspaces/ws-1/projects/nexo/issues/issue-1/attachments'
const ATTACHMENTS_KEY = [['attachments'], 'ws-1', 'nexo', 'issue-1']
const OTHER_ISSUE_KEY = [['attachments'], 'ws-1', 'nexo', 'issue-2']

function buildAttachment(
  overrides: Partial<AttachmentDTO> = {},
): AttachmentDTO {
  return {
    id: 'att-1',
    fileName: 'spec.pdf',
    contentType: 'application/pdf',
    size: 1024,
    url: 'https://storage.example.com/spec.pdf?sig=abc',
    issueId: 'issue-1',
    uploadedById: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildFile(name = 'spec.pdf', type = 'application/pdf') {
  return new File(['%PDF-1.4'], name, { type })
}

describe('useAttachments', () => {
  it('fetches the attachments of the issue', async () => {
    const attachments = [buildAttachment()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(attachments))

    const { result } = renderHookWithProviders(() =>
      useAttachments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(attachments)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: BASE_URL,
      method: 'GET',
    })
  })

  it.each([
    ['workspaceId', '', 'nexo', 'issue-1'],
    ['projectSlug', 'ws-1', '', 'issue-1'],
    ['issueId', 'ws-1', 'nexo', ''],
  ])('does not fetch while the %s is missing', (_, ws, slug, issue) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useAttachments(ws, slug, issue),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem acesso'))

    const { result } = renderHookWithProviders(() =>
      useAttachments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Sem acesso')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useAttachments('ws-1', 'nexo', 'issue-1'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar anexos')
  })
})

describe('useUploadAttachment', () => {
  it('POSTs the file as multipart form data without a JSON content type', async () => {
    const file = buildFile()
    const created = buildAttachment()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(created, 201))
    const { result } = renderHookWithProviders(() =>
      useUploadAttachment('ws-1', 'nexo', 'issue-1'),
    )

    let returned: AttachmentDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(file)
    })

    expect(returned).toEqual(created)
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe(BASE_URL)
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    // The browser must set the multipart boundary itself.
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toBeUndefined()
  })

  it('invalidates only this issue list after uploading', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildAttachment(), 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadAttachment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(ATTACHMENTS_KEY, [])
    queryClient.setQueryData(OTHER_ISSUE_KEY, [])

    await act(() => result.current.mutateAsync(buildFile()))

    expect(queryClient.getQueryState(ATTACHMENTS_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(OTHER_ISSUE_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('surfaces the backend message when the upload is rejected', async () => {
    mockFetch().mockResolvedValueOnce(apiError(413, 'Arquivo muito grande'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUploadAttachment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(ATTACHMENTS_KEY, [])

    await act(async () => {
      await expect(result.current.mutateAsync(buildFile())).rejects.toThrow(
        'Arquivo muito grande',
      )
    })

    expect(queryClient.getQueryState(ATTACHMENTS_KEY)?.isInvalidated).toBe(
      false,
    )
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUploadAttachment('ws-1', 'nexo', 'issue-1'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync(buildFile())).rejects.toThrow(
        'Erro ao enviar anexo',
      )
    })
  })
})

describe('useRemoveAttachment', () => {
  it('DELETEs the attachment and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveAttachment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(ATTACHMENTS_KEY, [buildAttachment()])

    await act(() => result.current.mutateAsync('att-1'))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${BASE_URL}/att-1`,
      method: 'DELETE',
      body: undefined,
    })
    expect(queryClient.getQueryState(ATTACHMENTS_KEY)?.isInvalidated).toBe(true)
  })

  it('falls back to the hook message and keeps the cache valid on failure', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useRemoveAttachment('ws-1', 'nexo', 'issue-1'),
    )
    queryClient.setQueryData(ATTACHMENTS_KEY, [buildAttachment()])

    await act(async () => {
      await expect(result.current.mutateAsync('att-1')).rejects.toThrow(
        'Erro ao remover anexo',
      )
    })

    expect(queryClient.getQueryState(ATTACHMENTS_KEY)?.isInvalidated).toBe(
      false,
    )
  })
})
