import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateProjectLinkDTO,
  UpdateProjectLinkDTO,
} from '@/src/schemas/project-link.schema'
import type { ProjectLinkDTO } from '@/types/project-link'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

export function projectLinksKey(workspaceId: string, slug: string) {
  return ['project-links', workspaceId, slug] as const
}

const baseUrl = (workspaceId: string, slug: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/links`

export function useProjectLinks(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectLinksKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectLinkDTO[]>(
        baseUrl(workspaceId, slug),
        undefined,
        'Erro ao buscar links',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 60 * 1000,
  })
}

function useInvalidateLinks(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: projectLinksKey(workspaceId, slug),
    })
}

export function useCreateProjectLink(workspaceId: string, slug: string) {
  const invalidate = useInvalidateLinks(workspaceId, slug)

  return useMutation({
    mutationFn: (data: CreateProjectLinkDTO) =>
      apiFetchJson<ProjectLinkDTO>(
        baseUrl(workspaceId, slug),
        'POST',
        data,
        'Erro ao adicionar link',
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateProjectLink(workspaceId: string, slug: string) {
  const invalidate = useInvalidateLinks(workspaceId, slug)

  return useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string
      data: UpdateProjectLinkDTO
    }) =>
      apiFetchJson<ProjectLinkDTO>(
        `${baseUrl(workspaceId, slug)}/${linkId}`,
        'PATCH',
        data,
        'Erro ao editar link',
      ),
    onSuccess: invalidate,
  })
}

export function useRemoveProjectLink(workspaceId: string, slug: string) {
  const invalidate = useInvalidateLinks(workspaceId, slug)

  return useMutation({
    mutationFn: (linkId: string) =>
      apiSend(
        `${baseUrl(workspaceId, slug)}/${linkId}`,
        { method: 'DELETE' },
        'Erro ao remover link',
      ),
    onSuccess: invalidate,
  })
}
