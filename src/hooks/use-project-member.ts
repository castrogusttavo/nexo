import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectMemberDTO } from '@/types/project'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const PROJECT_MEMBERS_KEY = ['project-members']

function projectMembersKey(workspaceId: string, projectSlug: string) {
  return [PROJECT_MEMBERS_KEY, workspaceId, projectSlug]
}

export function useProjectMembers(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: projectMembersKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<ProjectMemberDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/members`,
        undefined,
        'Erro ao buscar membros do projeto',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAddProjectMember(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetchJson<ProjectMemberDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/members`,
        'POST',
        { userId },
        'Erro ao adicionar membro',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMembersKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useRemoveProjectMember(
  workspaceId: string,
  projectSlug: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/members/${userId}`,
        { method: 'DELETE' },
        'Erro ao remover membro',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMembersKey(workspaceId, projectSlug),
      })
    },
  })
}
