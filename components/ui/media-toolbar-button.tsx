'use client'

import * as React from 'react'
import { PlaceholderPlugin } from '@platejs/media/react'
import { AudioLinesIcon, FileUpIcon, FilmIcon, ImageIcon, LinkIcon } from 'lucide-react'
import { isUrl, KEYS } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { toast } from 'sonner'
import { useFilePicker } from 'use-file-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ToolbarSplitButton, ToolbarSplitButtonPrimary, ToolbarSplitButtonSecondary } from './toolbar'

const MEDIA_CONFIG: Record<string, { accept: string[]; icon: React.ReactNode; title: string }> = {
  [KEYS.audio]: { accept: ['audio/*'], icon: <AudioLinesIcon className='size-4' />, title: 'Inserir áudio' },
  [KEYS.file]: { accept: ['*'], icon: <FileUpIcon className='size-4' />, title: 'Inserir arquivo' },
  [KEYS.img]: { accept: ['image/*'], icon: <ImageIcon className='size-4' />, title: 'Inserir imagem' },
  [KEYS.video]: { accept: ['video/*'], icon: <FilmIcon className='size-4' />, title: 'Inserir vídeo' },
}

export function MediaToolbarButton({ nodeType }: { nodeType: string }) {
  const currentConfig = MEDIA_CONFIG[nodeType]

  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const { openFilePicker } = useFilePicker({
    accept: currentConfig.accept,
    multiple: true,
    onFilesSuccessfullySelected: ({ plainFiles: updatedFiles }: { plainFiles: File[] }) => {
      const dataTransfer = new DataTransfer()
      updatedFiles.forEach((file) => dataTransfer.items.add(file))
      editor.getTransforms(PlaceholderPlugin).insert.media(dataTransfer.files)
    },
  })

  return (
    <>
      <ToolbarSplitButton
        onClick={() => openFilePicker()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        pressed={open}
      >
        <ToolbarSplitButtonPrimary>{currentConfig.icon}</ToolbarSplitButtonPrimary>

        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
          <DropdownMenuTrigger nativeButton={false} render={<ToolbarSplitButtonSecondary />} />

          <DropdownMenuContent onClick={(e) => e.stopPropagation()} align='start' alignOffset={-32}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openFilePicker()}>
                {currentConfig.icon}
                Enviar do computador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <LinkIcon />
                Inserir via URL
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarSplitButton>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className='gap-6'>
          <MediaUrlDialogContent currentConfig={currentConfig} nodeType={nodeType} setOpen={setDialogOpen} />
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MediaUrlDialogContent({
  currentConfig,
  nodeType,
  setOpen,
}: {
  currentConfig: (typeof MEDIA_CONFIG)[string]
  nodeType: string
  setOpen: (value: boolean) => void
}) {
  const editor = useEditorRef()
  const [url, setUrl] = React.useState('')

  const embedMedia = React.useCallback(() => {
    if (!isUrl(url)) return toast.error('URL inválida')

    setOpen(false)
    editor.tf.insertNodes({
      children: [{ text: '' }],
      name: nodeType === KEYS.file ? url.split('/').pop() : undefined,
      type: nodeType,
      url,
    })
  }, [url, editor, nodeType, setOpen])

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{currentConfig.title}</AlertDialogTitle>
      </AlertDialogHeader>

      <AlertDialogDescription className='group relative w-full'>
        <label
          className='-translate-y-1/2 absolute top-1/2 block cursor-text px-1 text-muted-foreground/70 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:font-medium group-focus-within:text-foreground group-focus-within:text-xs has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground has-[+input:not(:placeholder-shown)]:text-xs'
          htmlFor='url'
        >
          <span className='inline-flex bg-background px-2'>URL</span>
        </label>
        <Input
          id='url'
          className='w-full'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') embedMedia()
          }}
          type='url'
          autoFocus
        />
      </AlertDialogDescription>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault()
            embedMedia()
          }}
        >
          Confirmar
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
