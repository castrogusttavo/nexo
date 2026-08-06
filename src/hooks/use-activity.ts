import { useQuery } from '@tanstack/react-query'
import type { ActivityDTO, ActivityEntityTypeDTO } from '@/types/activity'
import { apiFetch } from './_fetch'

const ACTIVITIES_KEY = ['activities']

export function useActivities(
  workspaceId: string,
  projectSlug: string,
  entityType: ActivityEntityTypeDTO,
  entityId: string,
) {
  return useQuery({
    queryKey: [
      ACTIVITIES_KEY,
      workspaceId,
      projectSlug,
      entityType,
      entityId,
    ] as const,
    queryFn: () =>
      apiFetch<ActivityDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/activities?entityType=${entityType}&entityId=${entityId}`,
        undefined,
        'Erro ao buscar histórico de atividades',
      ),
    enabled: !!workspaceId && !!projectSlug && !!entityType && !!entityId,
    staleTime: 2 * 60 * 1000,
  })
}
