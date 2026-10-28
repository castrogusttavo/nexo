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
import { COVER_IMAGES } from './cover-images'

interface MediaCoverImagePickerProps {
  current?: string | null
  /** Picks one of the gallery covers. */
  onSelect: (url: string) => void
  /** Locks the gallery while a pick is being saved. */
  selecting?: boolean
  /** Sends the file; a rejection drops the preview. */
  onUpload: (file: File) => Promise<unknown>
  uploading: boolean
  uploadError?: string | null
}

// "Alterar capa": the gallery of stock covers and an upload drop zone. The
// caller decides what a pick or an upload saves (the user's cover, a
// project being created).
export function MediaCoverImagePicker({
  current,
  onSelect,
  selecting = false,
  onUpload,
  uploading,
  uploadError,
}: MediaCoverImagePickerProps) {
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
            <MediaCoverImageGallery
              current={current}
              disabled={selecting}
              onSelect={onSelect}
            />
          </TabsContent>
          <TabsContent value='upload'>
            <MediaCoverImageUpload
              onUpload={onUpload}
              uploading={uploading}
              error={uploadError}
            />
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MediaCoverImageGallery({
  current,
  disabled,
  onSelect,
}: {
  current?: string | null
  disabled: boolean
  onSelect: (url: string) => void
}) {
  return (
    <div className='grid grid-cols-4 gap-4 max-h-130 overflow-y-auto scrollbar-hidden py-1'>
      {COVER_IMAGES.map((src, index) => (
        <button
          key={src}
          type='button'
          aria-label={`Usar a capa ${index + 1}`}
          aria-pressed={current === src}
          disabled={disabled}
          onClick={() => onSelect(src)}
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

function MediaCoverImageUpload({
  onUpload,
  uploading,
  error,
}: {
  onUpload: (file: File) => Promise<unknown>
  uploading: boolean
  error?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    try {
      await onUpload(file)
    } catch {
      setPreview(null)
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
        disabled={uploading}
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
            <span className='text-xs'>Arraste ou clique para enviar</span>
          </>
        )}
      </button>
      {error && <p className='text-xs text-destructive'>{error}</p>}
      {/* Opened by the drop zone above: named for assistive tech, but out of
          the tab order so the zone stays the single stop. */}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        aria-label='Enviar capa'
        tabIndex={-1}
        className='sr-only'
        onChange={handleChange}
      />
    </div>
  )
}
