'use client'

import { PencilEdit01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { EstimateModelDTO, EstimateSystemDTO } from '@/types/estimate'
import { EstimateSystemForm } from './dialog-estimate-create'
import { EstimateValuesForm } from './dialog-estimate-manage-values'

type View = 'menu' | 'system' | 'values'

interface DialogEstimateEditOptionsProps {
  workspaceId: string
  projectSlug: string
  currentSystem: EstimateSystemDTO
  currentModel: EstimateModelDTO
}

export function DialogEstimateEditOptions({
  workspaceId,
  projectSlug,
  currentSystem,
  currentModel,
}: DialogEstimateEditOptionsProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setView('menu')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size='icon-sm' variant='ghost'>
            <NexoIcon icon={PencilEdit01Icon} strokeWidth={2} />
          </Button>
        }
      />
      <DialogContent
        className='bg-app space-y-6 py-5 w-2xl min-w-2xl max-w-2xl flex flex-col'
        showCloseButton={false}
      >
        {view === 'menu' && (
          <>
            <DialogHeader className='w-full flex-row items-center justify-between h-fit p-0 m-0'>
              <DialogTitle className='text-xl font-medium'>
                Editar sistema de estimativas
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-3'>
              <button
                type='button'
                className='w-full text-left rounded-md border border-border p-3 hover:bg-accent/50 transition-colors'
                onClick={() => setView('system')}
              >
                <h5 className='text-sm font-medium'>
                  Alterar tipo de estimativa
                </h5>
                <Muted className='text-xs'>
                  Converta seu sistema de pontos em sistema de categorias e
                  vice-versa.
                </Muted>
              </button>
              <button
                type='button'
                className='w-full text-left rounded-md border border-border p-3 hover:bg-accent/50 transition-colors'
                onClick={() => setView('values')}
              >
                <h5 className='text-sm font-medium'>
                  Adicionar, atualizar ou remover estimativas
                </h5>
                <Muted className='text-xs'>
                  Gerencie o sistema atual adicionando, atualizando ou removendo
                  os pontos ou categorias.
                </Muted>
              </button>
            </div>
            <DialogFooter className='m-0 border-t border-border pt-5 px-5'>
              <DialogClose>
                <Button type='button' variant='outline' size='sm'>
                  Cancelar
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
        {view === 'system' && (
          <EstimateSystemForm
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            currentSystem={currentSystem}
            currentModel={currentModel}
            onBack={() => setView('menu')}
            onDone={() => setOpen(false)}
          />
        )}
        {view === 'values' && (
          <EstimateValuesForm
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            onBack={() => setView('menu')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
