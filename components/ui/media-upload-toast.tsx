'use client'

import { PlaceholderPlugin, UploadErrorCode } from '@platejs/media/react'
import { usePluginOption } from 'platejs/react'
import { toast } from 'sonner'
import { useEffect } from 'react'

export function MediaUploadToast() {
  useUploadErrorToast()
  return null
}

const useUploadErrorToast = () => {
  const uploadError = usePluginOption(PlaceholderPlugin, 'error')

  useEffect(() => {
    if (!uploadError) return

    const { code, data } = uploadError

    switch (code) {
      case UploadErrorCode.INVALID_FILE_SIZE:
        toast.error(`O tamanho dos arquivos ${data.files.map((f) => f.name).join(', ')} é inválido`)
        break
      case UploadErrorCode.INVALID_FILE_TYPE:
        toast.error(`O tipo dos arquivos ${data.files.map((f) => f.name).join(', ')} é inválido`)
        break
      case UploadErrorCode.TOO_LARGE:
        toast.error(`O tamanho dos arquivos ${data.files.map((f) => f.name).join(', ')} é maior que ${data.maxFileSize}`)
        break
      case UploadErrorCode.TOO_LESS_FILES:
        toast.error(`O número mínimo de arquivos é ${data.minFileCount} para ${data.fileType}`)
        break
      case UploadErrorCode.TOO_MANY_FILES:
        toast.error(`O número máximo de arquivos é ${data.maxFileCount}${data.fileType ? ` para ${data.fileType}` : ''}`)
        break
    }
  }, [uploadError])
}
