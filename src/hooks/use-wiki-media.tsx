import * as React from 'react'
import { toast } from 'sonner'
import { ApiError } from './_fetch'
import { useWikiEditorContext } from './use-wiki-editor-context'

export interface UploadedWikiMedia {
  key: string
  url: string
  name: string
}

interface WikiMediaUploadResponse {
  success: boolean
  data?: { key: string; url: string }
  message?: string
}

function uploadWikiMediaXhr(
  workspaceId: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<{ key: string; url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/workspaces/${workspaceId}/wiki/media`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      let body: WikiMediaUploadResponse | null = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = null
      }

      if (xhr.status >= 200 && xhr.status < 300 && body?.data) {
        resolve(body.data)
      } else {
        reject(new ApiError(body?.message ?? 'Erro ao enviar arquivo'))
      }
    }

    xhr.onerror = () => reject(new ApiError('Erro ao enviar arquivo'))

    xhr.send(formData)
  })
}

export function useUploadWikiMedia() {
  const { workspaceId } = useWikiEditorContext()
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadingFile, setUploadingFile] = React.useState<File>()
  const [progress, setProgress] = React.useState(0)
  const [uploadedFile, setUploadedFile] = React.useState<UploadedWikiMedia>()

  const uploadFile = React.useCallback(
    async (file: File) => {
      setIsUploading(true)
      setUploadingFile(file)
      setProgress(0)

      try {
        const result = await uploadWikiMediaXhr(workspaceId, file, setProgress)
        const uploaded: UploadedWikiMedia = { ...result, name: file.name }
        setUploadedFile(uploaded)
        return uploaded
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Erro ao enviar arquivo'
        toast.error(message)
        throw error
      } finally {
        setProgress(0)
        setIsUploading(false)
        setUploadingFile(undefined)
      }
    },
    [workspaceId],
  )

  return { isUploading, progress, uploadedFile, uploadFile, uploadingFile }
}
