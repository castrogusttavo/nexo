'use client'

import { UserCircleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { WorkspaceLogo } from '@/app/_components/workspace/workspace-logo'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { notify } from '@/lib/notify'
import {
  useRemoveWorkspaceLogo,
  useUploadWorkspaceLogo,
} from '@/src/hooks/use-workspace'
import type { WorkspaceDTO } from '@/types/workspace'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024

export function WorkspaceSettingsLogoDialog({
  workspace,
  canEdit,
  open: controlledOpen,
  onOpenChange,
}: {
  workspace: WorkspaceDTO
  canEdit: boolean
  // Optional: the "Carregar logo" link in the header opens this same dialog.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const upload = useUploadWorkspaceLogo(workspace.id)
  const remove = useRemoveWorkspaceLogo(workspace.id)
  const inputRef = useRef<HTMLInputElement>(null)

  const [innerOpen, setInnerOpen] = useState(false)
  const open = controlledOpen ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pick(next: File | undefined) {
    if (!next) return
    if (!ACCEPT.split(',').includes(next.type))
      return notify.error('Formato não suportado. Use JPEG, PNG ou WebP')
    if (next.size > MAX_BYTES)
      return notify.error('Arquivo muito grande. Máximo 5 MB')
    setFile(next)
  }

  function close() {
    setOpen(false)
    setFile(null)
  }

  async function handleSave() {
    if (!file) return
    const ok = await notify.run(upload.mutateAsync(file), {
      loading: 'Enviando logo...',
      success: 'Logo atualizado',
      error: 'Não foi possível enviar o logo',
    })
    if (!ok) return
    close()
    router.refresh()
  }

  async function handleRemove() {
    const ok = await notify.run(remove.mutateAsync(), {
      loading: 'Removendo logo...',
      success: 'Logo removido',
      error: 'Não foi possível remover o logo',
    })
    if (!ok) return
    close()
    router.refresh()
  }

  const current = preview ?? workspace.image
  const busy = upload.isPending || remove.isPending

  const avatar = (
    <WorkspaceLogo
      name={workspace.name}
      image={current}
      className='size-14 rounded-lg text-2xl'
    />
  )

  if (!canEdit) return avatar

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger render={<button type='button' className='rounded-lg' />}>
        {avatar}
      </DialogTrigger>
      <DialogContent className='p-4 flex min-h-0 flex-col gap-3 overflow-clip min-w-xl'>
        <DialogHeader>
          <DialogTitle>Logo do workspace</DialogTitle>
        </DialogHeader>
        <div className='space-y-5 p-4'>
          <button
            type='button'
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files[0])
            }}
            className={`mx-auto size-80 flex items-center justify-center overflow-hidden rounded-lg text-center border-2 border-dashed border-border hover:bg-accent ${current ? '' : 'p-12'} ${dragging ? 'bg-accent' : ''}`}
          >
            {current ? (
              // Same crop as the avatar (square, object-cover): what is shown here is
              // what the workspace gets.
              <img src={current} alt='' className='size-full object-cover' />
            ) : (
              <span className='flex flex-col items-center gap-2'>
                <NexoIcon icon={UserCircleIcon} strokeWidth={2} size={64} />
                <span className='font-medium'>
                  Arraste uma imagem ou clique para escolher
                </span>
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type='file'
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Muted>Formatos aceitos: .jpeg, .jpg, .png, .webp (máx. 5 MB)</Muted>
        </div>
        <div className='flex items-center justify-between p-4 border-t border-border'>
          {workspace.image ? (
            <Button
              size='sm'
              variant='destructive'
              disabled={busy}
              onClick={handleRemove}
            >
              Remover
            </Button>
          ) : (
            <span />
          )}
          <div className='space-x-3'>
            <Button size='sm' variant='outline' onClick={close}>
              Cancelar
            </Button>
            <Button size='sm' disabled={!file || busy} onClick={handleSave}>
              Enviar e salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
