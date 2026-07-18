import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListMembersResult } from '@/types/member'
import type { MemberImportResult } from '@/types/member-import'
import { apiFetch } from './_fetch'

const MEMBER_KEY = ['members'] as const

export interface ListMembersParams {
  search?: string
  roles?: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

function toQueryString(params: ListMembersParams): string {
  const search = new URLSearchParams()
  if (params.search) search.set('search', params.search)
  if (params.roles?.length) search.set('roles', params.roles.join(','))
  search.set('sortBy', params.sortBy)
  search.set('sortOrder', params.sortOrder)
  search.set('page', String(params.page))
  search.set('pageSize', String(params.pageSize))
  return search.toString()
}

export function useMembers(
  workspaceId: string | null,
  params: ListMembersParams,
) {
  return useQuery({
    queryKey: [MEMBER_KEY, workspaceId, params],
    queryFn: () =>
      apiFetch<ListMembersResult>(
        `/api/workspaces/${workspaceId}/members?${toQueryString(params)}`,
        undefined,
        'Erro ao buscar membros',
      ),
    enabled: !!workspaceId,
    placeholderData: (previous) => previous,
  })
}

export function useImportMembers(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<MemberImportResult>(
        `/api/workspaces/${workspaceId}/members/import`,
        { method: 'POST', body: formData },
        'Erro ao importar membros',
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBER_KEY, workspaceId] })
      queryClient.invalidateQueries({
        queryKey: [['invitations'], workspaceId],
      })
    },
  })
}
