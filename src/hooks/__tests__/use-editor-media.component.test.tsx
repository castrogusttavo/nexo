import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import { useEditorMediaUrl, useUploadEditorMedia } from '../use-editor-media'

const BASE_URL = '/api/workspaces/ws-1/projects/nexo/editor-media'

describe('useEditorMediaUrl', () => {
  it('fetches the signed url for the media key', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://storage.example.com/a.png?sig=1' }),
    )

    const { result } = renderHookWithProviders(() =>
      useEditorMediaUrl('ws-1', 'nexo', 'editor/a.png'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      url: 'https://storage.example.com/a.png?sig=1',
    })
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${BASE_URL}?key=editor%2Fa.png`,
      method: 'GET',
    })
  })

  it('URL-encodes keys with reserved characters', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: 'https://storage.example.com/x' }),
    )

    const { result } = renderHookWithProviders(() =>
      useEditorMediaUrl('ws-1', 'nexo', 'a b&c=d?.png'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getFetchCall(fetchSpy).url).toBe(
      `${BASE_URL}?key=a%20b%26c%3Dd%3F.png`,
    )
  })

  it.each([
    ['workspaceId', '', 'nexo', 'k'],
    ['projectSlug', 'ws-1', '', 'k'],
    ['key', 'ws-1', 'nexo', undefined],
    ['key (empty)', 'ws-1', 'nexo', ''],
  ])('does not fetch while the %s is missing', (_, ws, slug, key) => {
    const fetchSpy = mockFetch()

    const { result } = renderHookWithProviders(() =>
      useEditorMediaUrl(ws, slug, key),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('caches the url per workspace, project and key', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess({ url: 'https://x' }))

    const { result, queryClient } = renderHookWithProviders(() =>
      useEditorMediaUrl('ws-1', 'nexo', 'k1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(
      queryClient.getQueryData(['editor-media-url', 'ws-1', 'nexo', 'k1']),
    ).toEqual({ url: 'https://x' })
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(404, 'Mídia não encontrada'))

    const { result } = renderHookWithProviders(() =>
      useEditorMediaUrl('ws-1', 'nexo', 'k'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Mídia não encontrada')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() =>
      useEditorMediaUrl('ws-1', 'nexo', 'k'),
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao carregar mídia')
  })
})

describe('useUploadEditorMedia', () => {
  it('POSTs the file as multipart form data and returns key and url', async () => {
    const file = new File(['png'], 'shot.png', { type: 'image/png' })
    const uploaded = { key: 'editor/shot.png', url: 'https://x/shot.png' }
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(uploaded, 201),
    )
    const { result } = renderHookWithProviders(() =>
      useUploadEditorMedia('ws-1', 'nexo'),
    )

    let returned: typeof uploaded | undefined
    await act(async () => {
      returned = await result.current.mutateAsync(file)
    })

    expect(returned).toEqual(uploaded)
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe(BASE_URL)
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toBeUndefined()
  })

  it('surfaces the backend message when the upload is rejected', async () => {
    mockFetch().mockResolvedValueOnce(apiError(415, 'Tipo não suportado'))
    const { result } = renderHookWithProviders(() =>
      useUploadEditorMedia('ws-1', 'nexo'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'a.exe')),
      ).rejects.toThrow('Tipo não suportado')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useUploadEditorMedia('ws-1', 'nexo'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(new File(['x'], 'a.png')),
      ).rejects.toThrow('Erro ao enviar arquivo')
    })
  })
})
