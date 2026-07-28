'use client'

import { Tag01Icon } from '@hugeicons-pro/core-solid-rounded'
import {
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useDeleteLabel, useLabels } from '@/src/hooks/use-label'
import type { LabelDTO } from '@/types/label'
import { LabelForm } from './label-form'

type FormTarget = { mode: 'create' } | { mode: 'edit'; label: LabelDTO }

interface ProjectLabelSettingsProps {
  workspaceId: string
  projectSlug: string
}

export function ProjectLabelsSettings({
  workspaceId,
  projectSlug,
}: ProjectLabelSettingsProps) {
  const { data: labels, isLoading } = useLabels(workspaceId, projectSlug)
  const deleteLabel = useDeleteLabel(workspaceId, projectSlug)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  function handleDelete(labelId: string) {
    deleteLabel.mutate(labelId, {
      onSuccess: () => notify.success('Etiqueta excluída'),
      onError: notify.error,
    })
  }

  return (
    <div className='py-9 w-full max-w-225 mx-auto'>
      <div className='w-full flex items-center justify-between'>
        <div>
          <H3>Etiquetas</H3>
          <Muted>
            Crie etiquetas personalizadas para categorizar suas issues.
          </Muted>
        </div>
        {!formTarget && (
          <Button size='sm' onClick={() => setFormTarget({ mode: 'create' })}>
            Adicionar etiqueta
          </Button>
        )}
      </div>
      {formTarget && (
        <LabelForm
          key={formTarget.mode === 'edit' ? formTarget.label.id : 'create'}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          onClose={() => setFormTarget(null)}
          label={formTarget.mode === 'edit' ? formTarget.label : undefined}
        />
      )}
      {isLoading ? (
        <Muted className='mt-4 text-sm'>Carregando...</Muted>
      ) : (
        (labels ?? []).map((label) => (
          <div
            key={label.id}
            className='group w-full flex items-center rounded-sm border border-border px-3.5 py-2 my-2 h-12'
          >
            <div className='w-full flex items-center gap-2'>
              <NexoIcon
                icon={Tag01Icon}
                size={14}
                className={cn(colorToText(label.color))}
              />
              <span className='text-sm'>{label.name}</span>
            </div>
            <div className='hidden group-hover:flex items-center gap-1.5 text-muted-foreground'>
              <Button
                size='icon-sm'
                variant='ghost'
                onClick={() => setFormTarget({ mode: 'edit', label })}
              >
                <NexoIcon icon={PencilEdit01Icon} strokeWidth={2} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button size='icon-sm' variant='ghost'>
                      <NexoIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>Excluir etiqueta</AlertDialogHeader>
                  <AlertDialogDescription>
                    Essa etiqueta será removida de todas as issues que a
                    utilizam. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant='destructive'
                      onClick={() => handleDelete(label.id)}
                      disabled={deleteLabel.isPending}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
