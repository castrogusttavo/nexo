import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StickyNoteDTO } from '@/types/sticky-note'
import {
  useCreateStickyNote,
  useDeleteStickyNote,
  useStickyNotes,
  useUpdateStickyNote,
} from '../use-sticky-note'

const STICKY_NOTES_KEY = ['sticky-notes']

function buildStickyNote(
  overrides: Partial<StickyNoteDTO> = {},
): StickyNoteDTO {
  return {
    id: 'sticky-1',
    content: { type: 'doc', content: [] },
    color: 'YELLOW',
    userId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useStickyNotes', () => {
  it('fetches the sticky notes from the API', async () => {
    const notes = [buildStickyNote()]
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(notes))

    const { result } = renderHookWithProviders(() => useStickyNotes())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(notes)
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/sticky-notes',
      method: 'GET',
    })
  })

  it('surfaces the backend message when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Falha no servidor'))

    const { result } = renderHookWithProviders(() => useStickyNotes())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Falha no servidor')
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))

    const { result } = renderHookWithProviders(() => useStickyNotes())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Erro ao buscar stickies')
  })
})

describe('useCreateStickyNote', () => {
  it('POSTs an empty body and invalidates the list', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildStickyNote(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateStickyNote(),
    )
    queryClient.setQueryData(STICKY_NOTES_KEY, [])

    await act(() => result.current.mutateAsync())

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/sticky-notes',
      method: 'POST',
      body: {},
    })
    expect(queryClient.getQueryState(STICKY_NOTES_KEY)?.isInvalidated).toBe(
      true,
    )
  })
})

describe('useUpdateStickyNote', () => {
  it('PATCHes the note and re-sorts the cache by updatedAt (newest first)', async () => {
    const older = buildStickyNote({
      id: 'sticky-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const newer = buildStickyNote({
      id: 'sticky-2',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    const updated = {
      ...older,
      color: 'BLUE' as const,
      updatedAt: '2026-01-03T00:00:00.000Z',
    }
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateStickyNote('sticky-1'),
    )
    queryClient.setQueryData(STICKY_NOTES_KEY, [newer, older])

    await act(() => result.current.mutateAsync({ color: 'BLUE' }))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/sticky-notes/sticky-1',
      method: 'PATCH',
      body: { color: 'BLUE' },
    })
    expect(queryClient.getQueryData(STICKY_NOTES_KEY)).toEqual([updated, newer])
  })

  it('leaves the cache empty when the list was never loaded', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(buildStickyNote()))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateStickyNote('sticky-1'),
    )

    await act(() => result.current.mutateAsync({ color: 'RED' }))

    expect(queryClient.getQueryData(STICKY_NOTES_KEY)).toBeUndefined()
  })
})

describe('useDeleteStickyNote', () => {
  it('DELETEs the note and drops it from the cache', async () => {
    const kept = buildStickyNote({ id: 'sticky-2' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteStickyNote(),
    )
    queryClient.setQueryData(STICKY_NOTES_KEY, [buildStickyNote(), kept])

    await act(() => result.current.mutateAsync('sticky-1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/sticky-notes/sticky-1',
      method: 'DELETE',
    })
    expect(queryClient.getQueryData(STICKY_NOTES_KEY)).toEqual([kept])
  })

  it('keeps the cache untouched when the delete fails', async () => {
    const notes = [buildStickyNote()]
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteStickyNote(),
    )
    queryClient.setQueryData(STICKY_NOTES_KEY, notes)

    await act(async () => {
      await expect(result.current.mutateAsync('sticky-1')).rejects.toThrow(
        'Sem permissão',
      )
    })

    expect(queryClient.getQueryData(STICKY_NOTES_KEY)).toEqual(notes)
  })
})
