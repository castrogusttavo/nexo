import { useQuery } from '@tanstack/react-query'
import type { ProjectProgressDTO } from '@/types/project-progress'
import { apiFetch } from './_fetch'

export function projectProgressKey(workspaceId: string, slug: string) {
  return ['project-progress', workspaceId, slug] as const
}

export function useProjectProgress(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectProgressKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectProgressDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}/progress`,
        undefined,
        'Erro ao buscar progresso do projeto',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 30 * 1000,
  })
}
