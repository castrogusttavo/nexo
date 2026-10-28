'use client'

import { MediaCoverImagePicker } from '@/app/_components/media/media-cover-image-picker'
import { notify } from '@/lib/notify'
import { useUploadProjectCover } from '@/src/hooks/use-project'

interface ProjectCoverImagePickerProps {
  workspaceId: string
  currentImage?: string
  onSelect?: (url: string) => void
}

// The cover of a project being created: picks and uploads only hand the URL
// back; the project saves it.
export function ProjectCoverImagePicker({
  workspaceId,
  currentImage,
  onSelect,
}: ProjectCoverImagePickerProps) {
  const uploadCover = useUploadProjectCover(workspaceId)

  return (
    <MediaCoverImagePicker
      current={currentImage}
      onSelect={(src) => onSelect?.(src)}
      onUpload={async (file) => {
        const url = await notify.mutate(uploadCover.mutateAsync(file), {
          loading: 'Enviando imagem...',
          success: 'Imagem enviada',
          error: 'Não foi possível enviar a imagem',
        })
        onSelect?.(url)
      }}
      uploading={uploadCover.isPending}
      uploadError={uploadCover.error?.message}
    />
  )
}
