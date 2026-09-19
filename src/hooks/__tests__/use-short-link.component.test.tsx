import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ShortLinkDTO } from '@/types/short-link'
import { useCreateShortLink, useShortLinks } from '../use-short-link'

const SHORT_LINK_KEY = ['short-links']

function buildShortLink(overrides: Partial<ShortLinkDTO> = {}): ShortLinkDTO {
  return {
    id: 'link-1',
    title: 'Docs',
    url: 'https://example.com/docs',
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useShortLinks', () => {
  it('fetches the short links from the API', async () => {
    const links = [buildShortLink(), buildShortLink({ id: 'link-2' })]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(links))

    const { result } = renderHookWithProviders(() => useShortLinks())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(links)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/short-links',
      method: 'GET',
    })
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Falha no servidor'))

    const { result } = renderHookWithProviders(() => useShortLinks())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Falha no servidor')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useShortLinks())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar short links')
  })
})

describe('useCreateShortLink', () => {
  it('POSTs the title and url and invalidates the list', async () => {
    const link = buildShortLink()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(link, 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateShortLink(),
    )
    queryClient.setQueryData(SHORT_LINK_KEY, [])

    let created: ShortLinkDTO | undefined
    await act(async () => {
      created = await result.current.mutateAsync({
        title: 'Docs',
        url: 'https://example.com/docs',
      })
    })

    expect(created).toEqual(link)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/short-links',
      method: 'POST',
      body: { title: 'Docs', url: 'https://example.com/docs' },
    })
    expect(queryClient.getQueryState(SHORT_LINK_KEY)?.isInvalidated).toBe(true)
  })

  it('does not invalidate the list when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(422, 'URL inválida'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateShortLink(),
    )
    queryClient.setQueryData(SHORT_LINK_KEY, [])

    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Docs', url: 'nope' }),
      ).rejects.toThrow('URL inválida')
    })

    expect(queryClient.getQueryState(SHORT_LINK_KEY)?.isInvalidated).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useCreateShortLink())

    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Docs', url: 'https://x.dev' }),
      ).rejects.toThrow('Erro ao criar short link')
    })
  })
})
