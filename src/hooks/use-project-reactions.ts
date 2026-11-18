import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectReactionSummaryDTO } from '@/types/project-reaction'
import { apiFetch, apiSend } from './_fetch'
import { applyReaction } from './use-update'

export function projectReactionsKey(workspaceId: string, slug: string) {
  return ['project-reactions', workspaceId, slug] as const
}

const baseUrl = (workspaceId: string, slug: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/reactions`

export function useProjectReactions(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectReactionsKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectReactionSummaryDTO[]>(
        baseUrl(workspaceId, slug),
        undefined,
        'Erro ao buscar reações',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 30 * 1000,
  })
}

export function useToggleProjectReaction(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()
  const key = projectReactionsKey(workspaceId, slug)

  return useMutation({
    mutationFn: ({ emoji, reacted }: { emoji: string; reacted: boolean }) =>
      apiSend(
        `${baseUrl(workspaceId, slug)}/${encodeURIComponent(emoji)}`,
        { method: reacted ? 'PUT' : 'DELETE' },
        'Erro ao reagir',
      ),
    onMutate: async ({ emoji, reacted }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous =
        queryClient.getQueryData<ProjectReactionSummaryDTO[]>(key)
      queryClient.setQueryData<ProjectReactionSummaryDTO[]>(key, (data) =>
        applyReaction(data ?? [], emoji, reacted),
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
