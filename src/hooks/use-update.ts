import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateUpdateDTO,
  CreateUpdateReplyDTO,
  EditUpdateDTO,
  EditUpdateReplyDTO,
} from '@/src/schemas/update.schema'
import type {
  UpdateDTO,
  UpdateReactionSummaryDTO,
  UpdateReplyDTO,
  UpdatesPageDTO,
} from '@/types/updates'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const UPDATES_KEY = ['updates'] as const
const REPLIES_KEY = ['update-replies'] as const

export function updatesKey(workspaceId: string, projectSlug: string) {
  return [...UPDATES_KEY, workspaceId, projectSlug] as const
}

export function updateRepliesKey(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
) {
  return [...REPLIES_KEY, workspaceId, projectSlug, updateId] as const
}

const baseUrl = (workspaceId: string, projectSlug: string) =>
  `/api/workspaces/${workspaceId}/projects/${projectSlug}/updates`

type UpdatesData = InfiniteData<UpdatesPageDTO, string | undefined>

// The feed, newest first, a page at a time. `nextCursor` of one page is the
// cursor of the next; the last page has none.
export function useUpdates(
  workspaceId: string,
  projectSlug: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: updatesKey(workspaceId, projectSlug),
    queryFn: ({ pageParam }) =>
      apiFetch<UpdatesPageDTO>(
        pageParam
          ? `${baseUrl(workspaceId, projectSlug)}?cursor=${encodeURIComponent(pageParam)}`
          : baseUrl(workspaceId, projectSlug),
        undefined,
        'Erro ao buscar atualizações',
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && !!workspaceId && !!projectSlug,
    staleTime: 60 * 1000,
  })
}

export function useCreateUpdate(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUpdateDTO) =>
      apiFetchJson<UpdateDTO>(
        baseUrl(workspaceId, projectSlug),
        'POST',
        data,
        'Erro ao publicar atualização',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: updatesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useEditUpdate(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      updateId,
      data,
    }: {
      updateId: string
      data: EditUpdateDTO
    }) =>
      apiFetchJson<UpdateDTO>(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}`,
        'PATCH',
        data,
        'Erro ao editar atualização',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: updatesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteUpdate(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updateId: string) =>
      apiSend(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}`,
        { method: 'DELETE' },
        'Erro ao excluir atualização',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: updatesKey(workspaceId, projectSlug),
      })
    },
  })
}

// Replies are fetched on demand, per update: the feed only carries the count.
export function useUpdateReplies(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: updateRepliesKey(workspaceId, projectSlug, updateId),
    queryFn: () =>
      apiFetch<UpdateReplyDTO[]>(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}/replies`,
        undefined,
        'Erro ao buscar respostas',
      ),
    enabled: enabled && !!workspaceId && !!projectSlug && !!updateId,
    staleTime: 60 * 1000,
  })
}

// A reply changes the thread and the feed's reply count.
function useInvalidateThread(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
) {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({
      queryKey: updateRepliesKey(workspaceId, projectSlug, updateId),
    })
    queryClient.invalidateQueries({
      queryKey: updatesKey(workspaceId, projectSlug),
    })
  }
}

export function useCreateUpdateReply(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
) {
  const invalidate = useInvalidateThread(workspaceId, projectSlug, updateId)

  return useMutation({
    mutationFn: (data: CreateUpdateReplyDTO) =>
      apiFetchJson<UpdateReplyDTO>(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}/replies`,
        'POST',
        data,
        'Erro ao responder',
      ),
    onSuccess: invalidate,
  })
}

export function useEditUpdateReply(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
) {
  const invalidate = useInvalidateThread(workspaceId, projectSlug, updateId)

  return useMutation({
    mutationFn: ({
      replyId,
      data,
    }: {
      replyId: string
      data: EditUpdateReplyDTO
    }) =>
      apiFetchJson<UpdateReplyDTO>(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}/replies/${replyId}`,
        'PATCH',
        data,
        'Erro ao editar resposta',
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteUpdateReply(
  workspaceId: string,
  projectSlug: string,
  updateId: string,
) {
  const invalidate = useInvalidateThread(workspaceId, projectSlug, updateId)

  return useMutation({
    mutationFn: (replyId: string) =>
      apiSend(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}/replies/${replyId}`,
        { method: 'DELETE' },
        'Erro ao excluir resposta',
      ),
    onSuccess: invalidate,
  })
}

// What the reaction list looks like after the viewer reacts (or takes it
// back). The server does the same arithmetic; this is only so the click shows
// at once.
export function applyReaction(
  reactions: UpdateReactionSummaryDTO[],
  emoji: string,
  reacted: boolean,
): UpdateReactionSummaryDTO[] {
  const existing = reactions.find((r) => r.emoji === emoji)

  if (reacted) {
    if (existing?.reactedByMe) return reactions
    if (!existing) return [...reactions, { emoji, count: 1, reactedByMe: true }]
    return reactions.map((r) =>
      r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r,
    )
  }

  if (!existing?.reactedByMe) return reactions
  return reactions.flatMap((r) => {
    if (r.emoji !== emoji) return [r]
    if (r.count <= 1) return []
    return [{ ...r, count: r.count - 1, reactedByMe: false }]
  })
}

function patchReaction(
  data: UpdatesData | undefined,
  updateId: string,
  emoji: string,
  reacted: boolean,
): UpdatesData | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      updates: page.updates.map((update) =>
        update.id === updateId
          ? {
              ...update,
              reactions: applyReaction(update.reactions, emoji, reacted),
            }
          : update,
      ),
    })),
  }
}

// One mutation for both directions: the call site knows whether the viewer
// already reacted. PUT and DELETE are idempotent on the server, so a retry
// after a dropped response is harmless.
export function useToggleUpdateReaction(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()
  const key = updatesKey(workspaceId, projectSlug)

  return useMutation({
    mutationFn: ({
      updateId,
      emoji,
      reacted,
    }: {
      updateId: string
      emoji: string
      /** true: add the viewer's reaction; false: take it back. */
      reacted: boolean
    }) =>
      apiSend(
        `${baseUrl(workspaceId, projectSlug)}/${updateId}/reactions/${encodeURIComponent(emoji)}`,
        { method: reacted ? 'PUT' : 'DELETE' },
        'Erro ao reagir',
      ),
    onMutate: async ({ updateId, emoji, reacted }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<UpdatesData>(key)
      queryClient.setQueryData<UpdatesData>(key, (data) =>
        patchReaction(data, updateId, emoji, reacted),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
