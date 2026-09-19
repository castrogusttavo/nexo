import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EmbedMatch } from '@/lib/embed-providers'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import { useResolveEmbed } from '../use-embed-metadata'

const SOURCE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

function buildEmbedMetadata(
  overrides: Partial<EmbedMatch & { thumbnailKey: string | null }> = {},
) {
  return {
    provider: 'youtube' as const,
    label: 'YouTube',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    sourceUrl: SOURCE_URL,
    thumbnailKey: 'embeds/thumb.jpg',
    ...overrides,
  }
}

describe('useResolveEmbed', () => {
  it('POSTs the url to the project embed-metadata route and returns the match', async () => {
    const metadata = buildEmbedMetadata()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(metadata))
    const { result } = renderHookWithProviders(() =>
      useResolveEmbed('ws-1', 'nexo'),
    )

    let returned: unknown
    await act(async () => {
      returned = await result.current.mutateAsync(SOURCE_URL)
    })

    expect(returned).toEqual(metadata)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1/projects/nexo/embed-metadata',
      method: 'POST',
      body: { url: SOURCE_URL },
    })
  })

  it('returns a null thumbnail key untouched', async () => {
    const metadata = buildEmbedMetadata({ thumbnailKey: null })
    mockFetch().mockResolvedValueOnce(apiSuccess(metadata))
    const { result } = renderHookWithProviders(() =>
      useResolveEmbed('ws-1', 'nexo'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync(SOURCE_URL)).resolves.toEqual(
        metadata,
      )
    })
  })

  it('surfaces the backend message for an unsupported url', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(422, 'Provedor não suportado', 'VALIDATION_ERROR'),
    )
    const { result } = renderHookWithProviders(() =>
      useResolveEmbed('ws-1', 'nexo'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync('https://example.com'),
      ).rejects.toThrow('Provedor não suportado')
    })
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useResolveEmbed('ws-1', 'nexo'),
    )

    await act(async () => {
      await expect(result.current.mutateAsync(SOURCE_URL)).rejects.toThrow(
        'Erro ao resolver embed',
      )
    })
  })
})
