'use client'

import type { TPlaceholderElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'
import { PlaceholderPlugin, PlaceholderProvider, updateUploadHistory } from '@platejs/media/react'
import { AudioLines, FileUp, Film, ImageIcon, Loader2Icon } from 'lucide-react'
import { KEYS } from 'platejs'
import { PlateElement, useEditorPlugin, withHOC } from 'platejs/react'
import { useFilePicker } from 'use-file-picker'
import { cn } from '@/lib/utils'
import { useUploadWikiMedia } from '@/src/hooks/use-wiki-media'
import { ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react'

const CONTENT: Record<string, { accept: string[]; content: ReactNode; icon: ReactNode }> = {
  [KEYS.audio]: { accept: ['audio/*'], content: 'Adicionar um áudio', icon: <AudioLines /> },
  [KEYS.file]: { accept: ['*'], content: 'Adicionar um arquivo', icon: <FileUp /> },
  [KEYS.img]: { accept: ['image/*'], content: 'Adicionar uma imagem', icon: <ImageIcon /> },
  [KEYS.video]: { accept: ['video/*'], content: 'Adicionar um vídeo', icon: <Film /> },
}

export const PlaceholderElement = withHOC(
  PlaceholderProvider,
  function PlaceholderElement(props: PlateElementProps<TPlaceholderElement>) {
    const { editor, element } = props
    const { api } = useEditorPlugin(PlaceholderPlugin)
    const { isUploading, progress, uploadedFile, uploadFile, uploadingFile } = useUploadWikiMedia()

    const loading = isUploading && uploadingFile
    const currentContent = CONTENT[element.mediaType]
    const isImage = element.mediaType === KEYS.img
    const imageRef = useRef<HTMLImageElement>(null)

    const { openFilePicker } = useFilePicker({
      accept: currentContent.accept,
      multiple: true,
      onFilesSuccessfullySelected: ({ plainFiles: updatedFiles }: { plainFiles: File[] }) => {
        const [firstFile, ...restFiles] = updatedFiles
        replaceCurrentPlaceholder(firstFile)
        if (restFiles.length > 0) {
          const dataTransfer = new DataTransfer()
          restFiles.forEach((file) => dataTransfer.items.add(file))
          editor.getTransforms(PlaceholderPlugin).insert.media(dataTransfer.files)
        }
      },
    })

    const replaceCurrentPlaceholder = useCallback(
      (file: File) => {
        void uploadFile(file)
        api.placeholder.addUploadingFile(element.id as string, file)
      },
      [api.placeholder, element.id, uploadFile]
    )

    useEffect(() => {
      if (!uploadedFile) return

      const path = editor.api.findPath(element)

      editor.tf.withoutSaving(() => {
        editor.tf.removeNodes({ at: path })

        const node = {
          children: [{ text: '' }],
          initialHeight: imageRef.current?.height,
          initialWidth: imageRef.current?.width,
          isUpload: true,
          name: element.mediaType === KEYS.file ? uploadedFile.name : '',
          placeholderId: element.id as string,
          type: element.mediaType!,
          url: uploadedFile.url,
        }

        editor.tf.insertNodes(node, { at: path })
        updateUploadHistory(editor, node)
      })

      api.placeholder.removeUploadingFile(element.id as string)
    }, [uploadedFile, element.id])

    const isReplaced = useRef(false)

    useEffect(() => {
      if (isReplaced.current) return

      const currentFiles = api.placeholder.getUploadingFile(element.id as string)
      if (!currentFiles) return

      replaceCurrentPlaceholder(currentFiles)
    }, [isReplaced])

    return (
      <PlateElement className='my-1' {...props}>
        {(!loading || !isImage) && (
          <div
            className='flex cursor-pointer select-none items-center rounded-sm bg-muted p-3 pr-9 hover:bg-primary/10'
            onClick={() => !loading && openFilePicker()}
            contentEditable={false}
          >
            <div className='relative mr-3 flex text-muted-foreground/80 [&_svg]:size-6'>{currentContent.icon}</div>
            <div className='whitespace-nowrap text-muted-foreground text-sm'>
              <div>{loading ? uploadingFile?.name : currentContent.content}</div>

              {loading && !isImage && (
                <div className='mt-1 flex items-center gap-1.5'>
                  <div>{formatBytes(uploadingFile?.size ?? 0)}</div>
                  <div>–</div>
                  <div className='flex items-center'>
                    <Loader2Icon className='mr-1 size-3.5 animate-spin text-muted-foreground' />
                    {progress ?? 0}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isImage && loading && <ImageProgress file={uploadingFile} imageRef={imageRef} progress={progress} />}

        {props.children}
      </PlateElement>
    )
  }
)

export function ImageProgress({
  className,
  file,
  imageRef,
  progress = 0
}: {
  file: File,
  className?: string,
    imageRef?: RefObject<HTMLImageElement | null>,
  progress?: number
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!objectUrl) return null

  return (
    <div className={cn('relative', className)} contentEditable={false}>
      <img ref={imageRef} className='h-auto w-full rounded-sm object-cover' alt={file.name} src={objectUrl} />
      {progress < 100 && (
        <div className='absolute right-1 bottom-1 flex items-center space-x-2 rounded-full bg-black/50 px-1 py-0.5'>
          <Loader2Icon className='size-3.5 animate-spin text-muted-foreground' />
          <span className='font-medium text-white text-xs'>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number, opts: { decimals?: number; sizeType?: 'accurate' | 'normal' } = {}) {
  const { decimals = 0, sizeType = 'normal' } = opts
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB']

  if (bytes === 0) return '0 Byte'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / 1024 ** i).toFixed(decimals)} ${sizeType === 'accurate' ? (accurateSizes[i] ?? 'Bytes') : (sizes[i] ?? 'Bytes')}`
}
