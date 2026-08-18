import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch } from './_fetch'

function editorMediaUrlKey(
  workspaceId: string,
  projectSlug: string,
  key: string,
) {
  return ['editor-media-url', workspaceId, projectSlug, key] as const
}

export function useEditorMediaUrl(
  workspaceId: string,
  projectSlug: string,
  key: string | undefined,
) {
  return useQuery({
    queryKey: editorMediaUrlKey(workspaceId, projectSlug, key ?? ''),
    queryFn: () =>
      apiFetch<{ url: string }>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/editor-media?key=${encodeURIComponent(key ?? '')}`,
        undefined,
        'Erro ao carregar mídia',
      ),
    enabled: !!workspaceId && !!projectSlug && !!key,
    staleTime: 30 * 60 * 1000,
  })
}

export function useUploadEditorMedia(workspaceId: string, projectSlug: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<{ key: string; url: string }>(
        `/api/workspaces/${workspaceId}/projects/${projectSlug}/editor-media`,
        { method: 'POST', body: formData },
        'Erro ao enviar arquivo',
      )
    },
  })
}
