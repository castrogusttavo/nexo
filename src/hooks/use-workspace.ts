import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateWorkspaceDTO,
  UpdateWorkspaceDTO,
} from '@/src/schemas/workspace.schema'
import type { WorkspaceDTO } from '@/types/workspace'
import { apiFetch, apiFetchJson } from './_fetch'

const WORKSPACE_KEY = ['workspace'] as const
const USER_KEY = ['user'] as const
const BASE_API_ROUTE = '/api/workspaces'

const workspaceKey = (workspaceId: string) =>
  [...WORKSPACE_KEY, workspaceId] as const

// The settings page hands the server-rendered workspace in as `initialData`.
// The page itself comes from the data access layer, which the client router
// keeps for minutes, so after a mutation the screen reads from this query
// instead: it is written by the mutation and refetched on invalidation.
export function useWorkspace(workspaceId: string, initialData: WorkspaceDTO) {
  return useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () =>
      apiFetch<WorkspaceDTO>(
        `${BASE_API_ROUTE}/${workspaceId}`,
        undefined,
        'Erro ao buscar workspace',
      ),
    initialData,
    staleTime: 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkspaceDTO) =>
      apiFetchJson<WorkspaceDTO>(
        BASE_API_ROUTE,
        'POST',
        data,
        'Erro ao criar workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateWorkspaceDTO) =>
      apiFetchJson<WorkspaceDTO>(
        `${BASE_API_ROUTE}/${workspaceId}`,
        'PATCH',
        data,
        'Erro ao atualizar workspace',
      ),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKey(workspaceId), workspace)
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

// The logo routes answer with the url (or nothing), not the workspace, so the
// cached copy is patched here; the invalidation right after reconciles it.
function setLogo(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  image: string | null,
) {
  queryClient.setQueryData<WorkspaceDTO>(
    workspaceKey(workspaceId),
    (workspace) => workspace && { ...workspace, image },
  )
}

export function useUploadWorkspaceLogo(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('logo', file)
      const { url } = await apiFetch<{ url: string }>(
        `${BASE_API_ROUTE}/${workspaceId}/logo`,
        { method: 'POST', body: form },
        'Erro ao enviar logo',
      )
      return url
    },
    onSuccess: (url) => {
      setLogo(queryClient, workspaceId, url)
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useRemoveWorkspaceLogo(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetchJson<null>(
        `${BASE_API_ROUTE}/${workspaceId}/logo`,
        'DELETE',
        undefined,
        'Erro ao remover logo',
      ),
    onSuccess: () => {
      setLogo(queryClient, workspaceId, null)
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}

export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetchJson<null>(
        `${BASE_API_ROUTE}/${workspaceId}`,
        'DELETE',
        undefined,
        'Erro ao excluir workspace',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_KEY })
      queryClient.invalidateQueries({ queryKey: USER_KEY })
    },
  })
}
