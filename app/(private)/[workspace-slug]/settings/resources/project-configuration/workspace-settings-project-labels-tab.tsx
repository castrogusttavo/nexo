'use client'

import { Tag01Icon } from '@hugeicons-pro/core-solid-rounded'
import {
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import {
  useDeleteProjectLabel,
  useProjectLabels,
} from '@/src/hooks/use-project-label'
import type { ProjectLabelDTO } from '@/types/project-label'
import { WorkspaceSettingsProjectLabelForm } from './workspace-settings-project-label-form'

type FormTarget = { mode: 'create' } | { mode: 'edit'; label: ProjectLabelDTO }

export function WorkspaceSettingsProjectLabelsTab({
  workspaceId,
  canConfigure,
}: {
  workspaceId: string
  canConfigure: boolean
}) {
  const { data: labels, isLoading, isError } = useProjectLabels(workspaceId)
  const deleteLabel = useDeleteProjectLabel(workspaceId)

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  function handleDelete(labelId: string) {
    notify.run(deleteLabel.mutateAsync(labelId), {
      loading: 'Excluindo etiqueta...',
      success: 'Etiqueta excluída',
      error: 'Não foi possível excluir a etiqueta',
    })
  }

  return (
    <>
      <div className='w-full flex items-center justify-between'>
        <div className='space-y-1'>
          <H4>Etiquetas do projeto</H4>
          <Muted>
            As etiquetas ajudam você a agrupar e filtrar projetos neste
            workspace.
          </Muted>
        </div>
        {canConfigure && !formTarget && (
          <Button
            size='sm'
            variant='secondary'
            onClick={() => setFormTarget({ mode: 'create' })}
          >
            Adicionar etiqueta
          </Button>
        )}
      </div>
      {formTarget && (
        <WorkspaceSettingsProjectLabelForm
          key={formTarget.mode === 'edit' ? formTarget.label.id : 'create'}
          workspaceId={workspaceId}
          onClose={() => setFormTarget(null)}
          label={formTarget.mode === 'edit' ? formTarget.label : undefined}
        />
      )}
      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className='flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 h-12'
            >
              <Skeleton className='size-3.5 rounded-full' />
              <Skeleton className='h-4 w-32' />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p role='alert' className='text-sm text-destructive'>
          Não foi possível carregar as etiquetas dos projetos.
        </p>
      ) : (labels ?? []).length === 0 ? (
        <div className='w-full border border-border py-10 rounded-lg text-center'>
          <Muted>Nenhuma etiqueta criada ainda.</Muted>
        </div>
      ) : (
        <div className='space-y-2'>
          {(labels ?? []).map((label) => (
            <div
              key={label.id}
              className='group w-full flex items-center rounded-lg border border-border bg-accent/25 px-3.5 py-2 h-12'
            >
              <div className='w-full flex items-center gap-2'>
                <NexoIcon
                  icon={Tag01Icon}
                  size={14}
                  className={cn(colorToText(label.color))}
                />
                <span className='text-sm'>{label.name}</span>
              </div>
              {canConfigure && (
                <div className='flex items-center gap-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100'>
                  <Button
                    size='icon-sm'
                    variant='ghost'
                    aria-label={`Editar etiqueta ${label.name}`}
                    onClick={() => setFormTarget({ mode: 'edit', label })}
                  >
                    <NexoIcon icon={PencilEdit01Icon} strokeWidth={2} />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        size='icon-sm'
                        variant='ghost'
                        aria-label={`Excluir etiqueta ${label.name}`}
                      >
                        <NexoIcon icon={Delete02Icon} strokeWidth={2} />
                      </Button>
                    }
                    title='Excluir etiqueta'
                    description='Essa etiqueta será removida de todos os projetos que a utilizam. Essa ação não pode ser desfeita.'
                    confirmLabel='Excluir'
                    pendingLabel='Excluindo...'
                    destructive
                    pending={deleteLabel.isPending}
                    onConfirm={() => handleDelete(label.id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
