import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectDTO } from '@/types/project'
import { apiFetch, apiFetchJson } from './_fetch'

const PROJECTS_KEY = ['projects']

function projectsKey(workspaceId: string) {
  return [PROJECTS_KEY, workspaceId] as const
}

function projectKey(workspaceId: string, slug: string) {
  return [PROJECTS_KEY, workspaceId, slug] as const
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

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      slug: string
      description?: string
      emoji?: string
      coverImage?: string
      isPublic?: boolean
    }) =>
      apiFetchJson<ProjectDTO>(
        `/api/workspaces/${workspaceId}/projects`,
        'POST',
        data,
        'Erro ao criar projeto',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
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
        { method: 'DELETE' },
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
