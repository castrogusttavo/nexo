import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  buildUpdateDTO,
  buildUpdateReplyDTO,
} from '@/src/__tests__/factories/dto/update.dto'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UpdateReactionSummaryDTO } from '@/types/updates'
import {
  applyReaction,
  updateRepliesKey,
  updatesKey,
  useCreateUpdate,
  useCreateUpdateReply,
  useDeleteUpdate,
  useDeleteUpdateReply,
  useEditUpdate,
  useEditUpdateReply,
  useToggleUpdateReaction,
  useUpdateReplies,
  useUpdates,
} from '../use-update'

const WS = 'ws-1'
const SLUG = 'alpha'
const URL = `/api/workspaces/${WS}/projects/${SLUG}/updates`
const KEY = updatesKey(WS, SLUG)

const page = (
  ids: string[],
  nextCursor: string | null = null,
  reactions: UpdateReactionSummaryDTO[] = [],
) => ({
  updates: ids.map((id) => buildUpdateDTO({ id, reactions })),
  nextCursor,
})

describe('useUpdates', () => {
  it('GETs the first page of the project updates', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(page(['u1', 'u2'])),
    )
    const { result } = renderHookWithProviders(() => useUpdates(WS, SLUG))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getFetchCall(fetchSpy)).toMatchObject({ url: URL, method: 'GET' })
    expect(result.current.data?.pages[0].updates.map((u) => u.id)).toEqual([
      'u1',
      'u2',
    ])
    expect(result.current.hasNextPage).toBe(false)
  })

  it('asks for the next page with the cursor, and appends it', async () => {
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(apiSuccess(page(['u1'], 'cur sor/1')))
      .mockResolvedValueOnce(apiSuccess(page(['u2'])))
    const { result } = renderHookWithProviders(() => useUpdates(WS, SLUG))
    await waitFor(() => expect(result.current.hasNextPage).toBe(true))

    await act(() => result.current.fetchNextPage())

    expect(getFetchCall(fetchSpy, 1).url).toBe(
      `${URL}?cursor=${encodeURIComponent('cur sor/1')}`,
    )
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('does not fetch when disabled', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useUpdates(WS, SLUG, { enabled: false }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not fetch without a workspace or a project', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() => useUpdates('', ''))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces the backend message when the feed cannot load', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'As atualizações estão desativadas neste projeto'),
    )
    const { result } = renderHookWithProviders(() => useUpdates(WS, SLUG))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe(
      'As atualizações estão desativadas neste projeto',
    )
  })
})

describe('update mutations', () => {
  it('useCreateUpdate POSTs the update and refreshes the feed', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildUpdateDTO(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateUpdate(WS, SLUG),
    )
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(() =>
      result.current.mutateAsync({ status: 'AT_RISK', content: 'Atrasado' }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: URL,
      method: 'POST',
      body: { status: 'AT_RISK', content: 'Atrasado' },
    })
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('useEditUpdate PATCHes the update url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildUpdateDTO()),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useEditUpdate(WS, SLUG),
    )
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(() =>
      result.current.mutateAsync({
        updateId: 'u1',
        data: { status: 'OFF_TRACK', content: 'Parou' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${URL}/u1`,
      method: 'PATCH',
      body: { status: 'OFF_TRACK', content: 'Parou' },
    })
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('useDeleteUpdate DELETEs the update url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteUpdate(WS, SLUG),
    )
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(() => result.current.mutateAsync('u1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${URL}/u1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it.each([
    ['useCreateUpdate', useCreateUpdate, 'Erro ao publicar atualização'],
    ['useDeleteUpdate', useDeleteUpdate, 'Erro ao excluir atualização'],
  ] as const)('%s falls back to its own message when the error has none', async (_name, useHook, fallback) => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useHook(WS, SLUG))

    await act(async () => {
      await expect(
        // @ts-expect-error each hook takes its own variables; none matter here
        result.current.mutateAsync({ status: 'ON_TRACK' }),
      ).rejects.toThrow(fallback)
    })
  })

  it('leaves the feed alone when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Sem permissão nesta atualização'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateUpdate(WS, SLUG),
    )
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ status: 'ON_TRACK' }),
      ).rejects.toThrow('Sem permissão nesta atualização')
    })

    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(false)
  })
})

describe('replies', () => {
  const REPLIES = `${URL}/u1/replies`
  const THREAD_KEY = updateRepliesKey(WS, SLUG, 'u1')

  it('useUpdateReplies GETs the thread of one update', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess([buildUpdateReplyDTO()]),
    )
    const { result } = renderHookWithProviders(() =>
      useUpdateReplies(WS, SLUG, 'u1'),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: REPLIES,
      method: 'GET',
    })
    expect(result.current.data).toHaveLength(1)
  })

  it('useUpdateReplies waits until it is enabled', () => {
    const fetchSpy = mockFetch()

    renderHookWithProviders(() =>
      useUpdateReplies(WS, SLUG, 'u1', { enabled: false }),
    )

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('useCreateUpdateReply POSTs the text and refreshes the thread and the feed', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildUpdateReplyDTO(), 201),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateUpdateReply(WS, SLUG, 'u1'),
    )
    queryClient.setQueryData(THREAD_KEY, [])
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(() => result.current.mutateAsync({ content: 'Valeu' }))

    expect(getFetchCall(fetchSpy)).toEqual({
      url: REPLIES,
      method: 'POST',
      body: { content: 'Valeu' },
    })
    expect(queryClient.getQueryState(THREAD_KEY)?.isInvalidated).toBe(true)
    // the feed shows how many replies each update has
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('useEditUpdateReply PATCHes the reply url', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildUpdateReplyDTO()),
    )
    const { result } = renderHookWithProviders(() =>
      useEditUpdateReply(WS, SLUG, 'u1'),
    )

    await act(() =>
      result.current.mutateAsync({
        replyId: 'r1',
        data: { content: 'Corrigido' },
      }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: `${REPLIES}/r1`,
      method: 'PATCH',
      body: { content: 'Corrigido' },
    })
  })

  it('useDeleteUpdateReply DELETEs the reply and refreshes both', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useDeleteUpdateReply(WS, SLUG, 'u1'),
    )
    queryClient.setQueryData(THREAD_KEY, [])
    queryClient.setQueryData(KEY, { pages: [], pageParams: [] })

    await act(() => result.current.mutateAsync('r1'))

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${REPLIES}/r1`,
      method: 'DELETE',
    })
    expect(queryClient.getQueryState(THREAD_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('useCreateUpdateReply surfaces the backend message', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'As atualizações estão desativadas neste projeto'),
    )
    const { result } = renderHookWithProviders(() =>
      useCreateUpdateReply(WS, SLUG, 'u1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ content: 'Oi' }),
      ).rejects.toThrow('As atualizações estão desativadas neste projeto')
    })
  })

  it('falls back to its own message when the error has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useCreateUpdateReply(WS, SLUG, 'u1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ content: 'Oi' }),
      ).rejects.toThrow('Erro ao responder')
    })
  })
})

describe('applyReaction', () => {
  const thumbs = (count: number, reactedByMe: boolean) => ({
    emoji: '👍',
    count,
    reactedByMe,
  })

  it('adds a new emoji with the viewer as its only reactor', () => {
    expect(applyReaction([], '🎉', true)).toEqual([
      { emoji: '🎉', count: 1, reactedByMe: true },
    ])
  })

  it('counts the viewer on an emoji others already used', () => {
    expect(applyReaction([thumbs(2, false)], '👍', true)).toEqual([
      thumbs(3, true),
    ])
  })

  it('does not count the viewer twice', () => {
    const reactions = [thumbs(2, true)]

    expect(applyReaction(reactions, '👍', true)).toBe(reactions)
  })

  it('takes the viewer back off, keeping the others', () => {
    expect(applyReaction([thumbs(3, true)], '👍', false)).toEqual([
      thumbs(2, false),
    ])
  })

  it('drops an emoji nobody uses any more', () => {
    expect(applyReaction([thumbs(1, true)], '👍', false)).toEqual([])
  })

  it('leaves it alone when the viewer never reacted with that emoji', () => {
    const reactions = [thumbs(2, false)]

    expect(applyReaction(reactions, '👍', false)).toBe(reactions)
    expect(applyReaction(reactions, '🎉', false)).toBe(reactions)
  })

  it('only touches the emoji it was given', () => {
    const party = { emoji: '🎉', count: 1, reactedByMe: false }

    expect(applyReaction([thumbs(1, false), party], '👍', true)).toEqual([
      thumbs(2, true),
      party,
    ])
  })
})

describe('useToggleUpdateReaction', () => {
  function seeded(reactions: UpdateReactionSummaryDTO[] = []) {
    const utils = renderHookWithProviders(() =>
      useToggleUpdateReaction(WS, SLUG),
    )
    utils.queryClient.setQueryData(KEY, {
      pages: [
        {
          updates: [
            buildUpdateDTO({ id: 'u1', reactions }),
            buildUpdateDTO({ id: 'u2' }),
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    })
    return utils
  }

  const reactionsOf = (
    queryClient: ReturnType<typeof seeded>['queryClient'],
    id: string,
  ) =>
    queryClient
      .getQueryData<{
        pages: { updates: { id: string; reactions: unknown[] }[] }[]
      }>(KEY)
      ?.pages[0].updates.find((u) => u.id === id)?.reactions

  it('PUTs the encoded emoji to add a reaction', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result } = seeded()

    await act(() =>
      result.current.mutateAsync({
        updateId: 'u1',
        emoji: '👍',
        reacted: true,
      }),
    )

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${URL}/u1/reactions/${encodeURIComponent('👍')}`,
      method: 'PUT',
    })
  })

  it('DELETEs the encoded emoji to take it back', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result } = seeded([{ emoji: '👍', count: 1, reactedByMe: true }])

    await act(() =>
      result.current.mutateAsync({
        updateId: 'u1',
        emoji: '👍',
        reacted: false,
      }),
    )

    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: `${URL}/u1/reactions/${encodeURIComponent('👍')}`,
      method: 'DELETE',
    })
  })

  it('shows the reaction at once, before the server answers', async () => {
    const pending = deferredResponse()
    mockFetch().mockReturnValueOnce(pending.promise)
    const { result, queryClient } = seeded()

    act(() => {
      result.current.mutate({ updateId: 'u1', emoji: '🎉', reacted: true })
    })

    await waitFor(() =>
      expect(reactionsOf(queryClient, 'u1')).toEqual([
        { emoji: '🎉', count: 1, reactedByMe: true },
      ]),
    )
    expect(reactionsOf(queryClient, 'u2')).toEqual([])
    pending.resolve(apiSuccess(null))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('shows the reaction gone at once when it is taken back', async () => {
    const pending = deferredResponse()
    mockFetch().mockReturnValueOnce(pending.promise)
    const { result, queryClient } = seeded([
      { emoji: '👍', count: 1, reactedByMe: true },
    ])

    act(() => {
      result.current.mutate({ updateId: 'u1', emoji: '👍', reacted: false })
    })

    await waitFor(() => expect(reactionsOf(queryClient, 'u1')).toEqual([]))
    pending.resolve(apiSuccess(null))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('puts the feed back when the server refuses', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'As atualizações estão desativadas neste projeto'),
    )
    const before = [{ emoji: '👍', count: 2, reactedByMe: false }]
    const { result, queryClient } = seeded(before)

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          updateId: 'u1',
          emoji: '👍',
          reacted: true,
        }),
      ).rejects.toThrow('As atualizações estão desativadas neste projeto')
    })

    expect(reactionsOf(queryClient, 'u1')).toEqual(before)
  })

  it("refetches the feed once it settles, to take the server's word", async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = seeded()

    await act(() =>
      result.current.mutateAsync({
        updateId: 'u1',
        emoji: '👍',
        reacted: true,
      }),
    )

    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true)
  })

  it('falls back to its own message when the error has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = seeded()

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          updateId: 'u1',
          emoji: '👍',
          reacted: true,
        }),
      ).rejects.toThrow('Erro ao reagir')
    })
  })

  it('does nothing to a feed that was never loaded', async () => {
    mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { result, queryClient } = renderHookWithProviders(() =>
      useToggleUpdateReaction(WS, SLUG),
    )

    await act(() =>
      result.current.mutateAsync({
        updateId: 'u1',
        emoji: '👍',
        reacted: true,
      }),
    )

    expect(queryClient.getQueryData(KEY)).toBeUndefined()
  })
})
