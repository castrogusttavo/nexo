import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SuccessResponse } from '@/types/http-response'
import type { ProjectDTO } from '@/types/project'

export function useUploadProjectCover(workspaceId: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/cover-image`,
        { method: 'POST', body: form },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao fazer upload da capa')
      }
      const json: SuccessResponse<{ url: string }> = await res.json()
      return json.data.url
    },
  })
}

function projectsKey(workspaceId: string) {
  return ['projects', workspaceId] as const
}

function projectKey(workspaceId: string, slug: string) {
  return ['projects', workspaceId, slug] as const
}

export function useProjects(workspaceId: string, archived = false) {
  return useQuery({
    queryKey: [...projectsKey(workspaceId), { archived }],
    queryFn: async (): Promise<ProjectDTO[]> => {
      const url = `/api/workspaces/${workspaceId}/projects/${archived ? '?archived=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao buscar projetos')
      const json: SuccessResponse<ProjectDTO[]> = await res.json()
      return json.data
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useProject(workspaceId: string, slug: string) {
  return useQuery({
    queryKey: projectKey(workspaceId, slug),
    queryFn: async (): Promise<ProjectDTO> => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${slug}`)
      if (!res.ok) throw new Error('Erro ao buscar projeto')
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
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
    }): Promise<ProjectDTO> => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao criar projeto')
      }
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
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
    }): Promise<ProjectDTO> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao atualizar projeto')
      }
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
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
    mutationFn: async (): Promise<ProjectDTO> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}/archive`,
        { method: 'PATCH' },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao arquivar projeto')
      }
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useRestoreProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ProjectDTO> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}/restore`,
        { method: 'PATCH' },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao restaurar projeto')
      }
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useDeleteProject(workspaceId: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ProjectDTO> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao deletar projeto')
      }
      const json: SuccessResponse<ProjectDTO> = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKey(workspaceId, slug) })
    },
  })
}

export function useFavoriteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slug: string): Promise<{ favorited: boolean }> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}/favorite`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao favoritar projeto')
      }
      const json: SuccessResponse<{ favorited: boolean }> = await res.json()
      return json.data
    },
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
    mutationFn: async (slug: string): Promise<{ favorited: boolean }> => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/projects/${slug}/favorite`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Erro ao desfavoritar projeto')
      }
      const json: SuccessResponse<{ favorited: boolean }> = await res.json()
      return json.data
    },
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
