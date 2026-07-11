'use client'

import { Upload01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useRef, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import { useUploadProjectCover } from '@/src/hooks/use-project'

export const COVER_IMAGES = [
  '/coverImages/image_1.jpg',
  '/coverImages/image_2.jpg',
  '/coverImages/image_3.jpg',
  '/coverImages/image_4.jpg',
  '/coverImages/image_5.jpg',
  '/coverImages/image_6.jpg',
  '/coverImages/image_7.jpg',
  '/coverImages/image_8.jpg',
  '/coverImages/image_9.jpg',
  '/coverImages/image_10.jpg',
  '/coverImages/image_11.jpg',
  '/coverImages/image_12.jpg',
  '/coverImages/image_13.jpg',
  '/coverImages/image_14.jpg',
  '/coverImages/image_15.jpg',
  '/coverImages/image_16.jpg',
  '/coverImages/image_17.jpg',
  '/coverImages/image_18.jpg',
  '/coverImages/image_19.jpg',
  '/coverImages/image_20.jpg',
  '/coverImages/image_21.jpg',
  '/coverImages/image_22.jpg',
  '/coverImages/image_23.jpg',
  '/coverImages/image_24.jpg',
  '/coverImages/image_25.jpg',
  '/coverImages/image_26.jpg',
  '/coverImages/image_27.jpg',
  '/coverImages/image_28.jpg',
  '/coverImages/image_29.jpg',
]

interface CoverImagePickerProps {
  workspaceId: string
  currentImage?: string
  onSelect?: (url: string) => void
}

export function CoverImagePicker({
  workspaceId,
  currentImage,
  onSelect,
}: CoverImagePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='secondary' size='xs'>
            Alterar capa
          </Button>
        }
      />
      <DropdownMenuContent className='w-auto p-2.5' align='end'>
        <Tabs defaultValue='images' className='w-xl'>
          <TabsList className='bg-transparent! w-full flex'>
            <TabsTrigger value='images'>Imagens</TabsTrigger>
            <TabsTrigger value='upload'>Upload</TabsTrigger>
          </TabsList>
          <TabsContent value='images'>
            <ImagesTab current={currentImage} onSelect={onSelect} />
          </TabsContent>
          <TabsContent value='upload'>
            <UploadTab workspaceId={workspaceId} onSelect={onSelect} />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ImagesTab({
  current,
  onSelect,
}: {
  current?: string
  onSelect?: (url: string) => void
}) {
  return (
    <div className='grid grid-cols-4 gap-4 max-h-130 overflow-y-auto scrollbar-hidden py-1'>
      {COVER_IMAGES.map((src) => (
        <button
          key={src}
          type='button'
          onClick={() => onSelect?.(src)}
          className='relative h-16 w-full overflow-hidden rounded-md border-2 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          style={{
            borderColor:
              current === src ? 'hsl(var(--primary))' : 'transparent',
          }}
        >
          <img src={src} alt='' className='h-full w-full object-cover' />
        </button>
      ))}
    </div>
  )
}

function UploadTab({
  workspaceId,
  onSelect,
}: {
  workspaceId: string
  onSelect?: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const upload = useUploadProjectCover(workspaceId)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    try {
      const url = await upload.mutateAsync(file)
      onSelect?.(url)
    } catch (err) {
      setPreview(null)
      notify.error(err, 'Não foi possível enviar a imagem')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className='py-1 space-y-1.5'>
      <button
        type='button'
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className='flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed'
        style={{ borderColor: dragging ? 'hsl(var(--primary))' : undefined }}
      >
        {preview ? (
          <img
            src={preview}
            alt=''
            className='h-full w-full rounded-md object-cover'
          />
        ) : (
          <>
            <NexoIcon icon={Upload01Icon} size={20} />
            <span className='text-xs'>
              {upload.isPending
                ? 'Enviando...'
                : 'Arraste ou clique para enviar'}
            </span>
          </>
        )}
      </button>
      {upload.isError && (
        <p className='text-xs text-destructive'>{upload.error?.message}</p>
      )}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='sr-only'
        onChange={handleChange}
      />
    </div>
  )
}
