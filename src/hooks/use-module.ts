import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ModuleDTO,
  ModuleMemberDTO,
  ModuleStatusDTO,
} from '@/types/module'
import { apiFetch, apiFetchJson, apiSend } from './_fetch'

const MODULES_KEY = ['modules']

function modulesKey(workspaceId: string, projectSlug: string) {
  return [MODULES_KEY, workspaceId, projectSlug] as const
}

function moduleMembersKey(
  workspaceId: string,
  projectSlug: string,
  moduleId: string,
) {
  return [MODULES_KEY, workspaceId, projectSlug, moduleId] as const
}

export function useModules(workspaceId: string, projectSlug: string) {
  return useQuery({
    queryKey: modulesKey(workspaceId, projectSlug),
    queryFn: () =>
      apiFetch<ModuleDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules`,
        undefined,
        'Erro ao buscar módulos',
      ),
    enabled: !!workspaceId && !!projectSlug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateModule(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      status?: ModuleStatusDTO
      startDate?: string
      endDate?: string
    }) =>
      apiFetchJson<ModuleDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules`,
        'POST',
        data,
        'Erro ao criar módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: modulesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUpdateModule(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      moduleId,
      data,
    }: {
      moduleId: string
      data: {
        name?: string
        status?: ModuleStatusDTO
        startDate?: string | null
        endDate?: string | null
        progress?: number
      }
    }) =>
      apiFetchJson<ModuleDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}`,
        'PATCH',
        data,
        'Erro ao atualizar módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: modulesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useDeleteModule(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (moduleId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}`,
        { method: 'DELETE' },
        'Erro ao deletar módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: modulesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useModuleMembers(
  workspaceId: string,
  projectSlug: string,
  moduleId: string,
) {
  return useQuery({
    queryKey: moduleMembersKey(workspaceId, projectSlug, moduleId),
    queryFn: () =>
      apiFetch<ModuleMemberDTO[]>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}/members`,
        undefined,
        'Erro ao buscar memberos do módulo',
      ),
    enabled: !!workspaceId && !!projectSlug && !!moduleId,
  })
}

export function useAddModuleMember(
  workspaceId: string,
  projectSlug: string,
  moduleId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetchJson<ModuleMemberDTO>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}/members`,
        'POST',
        { userId },
        'Erro ao adicionar membro ao módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleMembersKey(workspaceId, projectSlug, moduleId),
      })
    },
  })
}

export function useRemoveModuleMember(
  workspaceId: string,
  projectSlug: string,
  moduleId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}/members/${userId}`,
        { method: 'DELETE' },
        'Erro ao remover membro ao módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleMembersKey(workspaceId, projectSlug, moduleId),
      })
    },
  })
}

export function useFavoriteModule(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (moduleId: string) =>
      apiFetchJson<{ favorited: boolean }>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}/favorite`,
        'POST',
        undefined,
        'Erro ao favoritar módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: modulesKey(workspaceId, projectSlug),
      })
    },
  })
}

export function useUnfavoriteModule(workspaceId: string, projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (moduleId: string) =>
      apiFetch<{ favorited: boolean }>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/modules/${moduleId}/favorite`,
        { method: 'DELETE' },
        'Erro ao desfavoritar módulo',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: modulesKey(workspaceId, projectSlug),
      })
    },
  })
}
