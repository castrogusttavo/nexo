import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Value } from 'platejs'
import type { ProjectDocumentDTO } from '@/types/project-document'
import { apiFetch, apiFetchJson } from './_fetch'

export function projectDocumentKey(workspaceId: string, slug: string) {
  return ['project-document', workspaceId, slug] as const
}

function route(workspaceId: string, slug: string) {
  return `/api/workspaces/${workspaceId}/projects/${slug}/document`
}

export function useProjectDocument(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectDocumentKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectDocumentDTO>(
        route(workspaceId, slug),
        undefined,
        'Erro ao buscar documento do projeto',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 60 * 1000,
  })
}

// Snapshot autosave. The live content travels over Yjs; this keeps the flat
// JSON current for reads that never open the socket.
export function useSaveProjectDocument(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: Value) =>
      apiFetchJson<ProjectDocumentDTO>(
        route(workspaceId, slug),
        'PUT',
        { content },
        'Erro ao salvar documento do projeto',
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(projectDocumentKey(workspaceId, slug), saved)
    },
  })
}
