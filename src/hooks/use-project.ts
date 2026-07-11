import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InvitationDTO, InviteToProjectResult } from '@/types/invitation'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import { apiFetch, apiSend } from './_fetch'

const PROJECTS_KEY = ['projects']

function projectsKey(workspaceId: string) {
  return [PROJECTS_KEY, workspaceId] as const
}

function projectKey(workspaceId: string, slug: string) {
  return [PROJECTS_KEY, workspaceId, slug] as const
}

function membersKey(workspaceId: string, slug: string) {
  return [...projectKey(workspaceId, slug), 'members'] as const
}

function projectInvitationsKey(workspaceId: string, slug: string) {
  return [...projectKey(workspaceId, slug), 'invitations'] as const
}

export function useUploadProjectCover(workspaceId: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('file', file)
      const { url } = await apiFetch<{ url: string }>(
        `/api/workspaces/${workspaceId}/projects/cover-image`,
        { method: 'POST', body: form },
        'Erro ao enviar capa',
      )
      return url
    },
  })
}

export function useProjects(workspaceId: string, archived = false) {
  return useQuery({
    queryKey: [...projectsKey(workspaceId), { archived }],
    queryFn: () =>
      apiFetch<ProjectDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${archived ? '?archived=true' : ''}`,
        undefined,
        'Erro ao buscar projetos',
      ),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useProject(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}`,
        undefined,
        'Erro ao buscar projeto',
      ),
    enabled: !!workspaceId && !!slug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      slug: string
      description?: string
      emoji?: string
      coverImage?: string
      isPublic?: boolean
    }) =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao criar projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
    },
  })
}

export function useUpdateProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name?: string
      slug?: string
      description?: string | null
      emoji?: string | null
      coverImage?: string | null
      isPublic?: boolean
      leadId?: string
    }) =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao atualizar projeto',
      ),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
      if (updated.slug !== slug) {
        queryClient.invalidateQueries({
          queryKey: projectKey(workspaceId, updated.slug),
        })
      }
    },
  })
}

export function useArchiveProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}/archive`,
        { method: 'PATCH' },
        'Erro ao arquivar projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useRestoreProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}/restore`,
        { method: 'PATCH' },
        'Erro ao restaurar projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useDeleteProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}`,
        { method: 'DELETE' },
        'Erro ao deletar projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useFavoriteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      apiFetch<{ favourited: boolean }>(
        `/api/workspaces/${workspaceId}/projects/${slug}/favorite`,
        { method: 'POST' },
        'Erro ao favoritar projeto',
      ),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: projectsKey(workspaceId) })
      const previous = queryClient.getQueriesData<ProjectDTO[]>({
        queryKey: projectsKey(workspaceId),
      })
      queryClient.setQueriesData<ProjectDTO[]>(
        { queryKey: projectsKey(workspaceId) },
        (old) =>
          old?.map((p) => (p.slug === slug ? { ...p, isFavorited: true } : p)),
      )
      return { previous }
    },
    onError: (_err, _slug, ctx) => {
      for (const [key, data] of ctx?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (_data, _err, slug) => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useUnfavoriteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      apiFetch(
        `/api/workspaces/${workspaceId}/projects/${slug}/favorite`,
        { method: 'POST' },
        'Erro ao desafavoritar projeto',
      ),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: projectsKey(workspaceId) })
      const previous = queryClient.getQueriesData<ProjectDTO[]>({
        queryKey: projectsKey(workspaceId),
      })
      queryClient.setQueriesData<ProjectDTO[]>(
        { queryKey: projectsKey(workspaceId) },
        (old) =>
          old?.map((p) => (p.slug === slug ? { ...p, isFavorited: false } : p)),
      )
      return { previous }
    },
    onError: (_err, _slug, ctx) => {
      for (const [key, data] of ctx?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (_data, _err, slug) => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useProjectMembers(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: membersKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<ProjectMemberDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${slug}/members`,
        undefined,
        'Erro ao buscar usuários',
      ),
    enabled: !!workspaceId && !!slug,
  })
}

export function useAddProjectMember(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ProjectMemberDTO>(
        `/api/workspaces/${workspaceId}/projects/${slug}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        },
        'Erro ao adicionar membro',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId, slug) })
    },
  })
}

export function useRemoveProjectMember(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${slug}/members/${userId}`,
        { method: 'DELETE' },
        'Erro ao remover membro',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId, slug) })
    },
  })
}

export function useProjectInvitations(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectInvitationsKey(workspaceId, slug),
    queryFn: () =>
      apiFetch<InvitationDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${slug}/members/invite`,
        undefined,
        'Erro ao buscar convites do projeto',
      ),
    enabled: !!workspaceId && !!slug,
  })
}

export function useInviteToProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { email: string; role?: string }) =>
      apiFetch<InviteToProjectResult>(
        `/api/workspaces/${workspaceId}/projects/${slug}/members/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'Erro ao convidar para o projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId, slug) })
      queryClient.invalidateQueries({
        queryKey: projectInvitationsKey(workspaceId, slug),
      })
    },
  })
}

export function useRevokeProjectInvitation(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${slug}/members/invite/${invitationId}`,
        { method: 'DELETE' },
        'Erro ao revogar convite',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectInvitationsKey(workspaceId, slug),
      })
    },
  })
}

export function useResendProjectInvitation(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${slug}/members/invite/${invitationId}/resend`,
        { method: 'POST' },
        'Erro ao reenviar convite',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectInvitationsKey(workspaceId, slug),
      })
    },
  })
}
