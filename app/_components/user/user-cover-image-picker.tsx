'use client'

import { notify } from '@/lib/notify'
import { useUpdateUser, useUploadCover } from '@/src/hooks/use-user'
import { MediaCoverImagePicker } from '../media/media-cover-image-picker'

// The account's cover: a gallery pick or an upload saves it at once.
export function UserCoverImagePicker({
  currentImage,
}: {
  currentImage?: string | null
}) {
  const updateUser = useUpdateUser()
  const uploadCover = useUploadCover()

  return (
    <MediaCoverImagePicker
      current={currentImage}
      selecting={updateUser.isPending}
      onSelect={(src) =>
        notify.run(updateUser.mutateAsync({ coverImage: src }), {
          loading: 'Atualizando capa...',
          success: 'Capa atualizada',
          error: 'Erro ao atualizar capa',
        })
      }
      onUpload={(file) =>
        notify.mutate(uploadCover.mutateAsync(file), {
          loading: 'Enviando capa...',
          success: 'Capa atualizada',
          error: 'Não foi possível enviar a capa',
        })
      }
      uploading={uploadCover.isPending}
      uploadError={uploadCover.error?.message}
    />
  )
}
