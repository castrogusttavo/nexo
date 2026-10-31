'use client'

import {
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ComponentProps } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import type { ProjectStateDTO } from '@/types/project-state'

export function WorkspaceSettingsProjectStateRow({
  state,
  icon,
  strokeWidth,
  canConfigure,
  onlyInGroup,
  settingDefault,
  deleting,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  state: ProjectStateDTO
  icon: ComponentProps<typeof NexoIcon>['icon']
  strokeWidth?: number
  canConfigure: boolean
  /** The last state of its group cannot be deleted. */
  onlyInGroup: boolean
  settingDefault: boolean
  deleting: boolean
  onEdit: () => void
  onSetDefault: () => void
  onDelete: () => void
}) {
  // The API refuses both (PROJECT_STATE_IS_DEFAULT, PROJECT_STATE_LAST_IN_GROUP);
  // say so up front instead of after the click.
  const deleteBlocked = state.isDefault
    ? 'Defina outro estado como padrão antes de excluir este'
    : onlyInGroup
      ? 'O grupo precisa manter ao menos um estado'
      : null

  return (
    <div className='h-12 group bg-accent/25 border border-border p-3 rounded-lg w-full flex items-center justify-between'>
      <div className='flex items-center gap-1.5'>
        <NexoIcon
          icon={icon}
          strokeWidth={strokeWidth}
          className={cn(colorToText(state.color))}
        />
        {state.name}
        {state.isDefault && !canConfigure && (
          <Muted className='text-xs px-2 m-0!'>Padrão</Muted>
        )}
      </div>
      {canConfigure && (
        <div className='flex items-center gap-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100'>
          {state.isDefault ? (
            <Muted className='text-xs px-2 m-0!'>Padrão</Muted>
          ) : (
            <Button
              variant='ghost'
              size='xs'
              disabled={settingDefault}
              onClick={onSetDefault}
            >
              Marcar como padrão
            </Button>
          )}
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={`Editar estado ${state.name}`}
            onClick={onEdit}
          >
            <NexoIcon icon={PencilEdit01Icon} strokeWidth={2} />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Excluir estado ${state.name}`}
                title={deleteBlocked ?? undefined}
                disabled={!!deleteBlocked}
              >
                <NexoIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            }
            title='Excluir estado'
            description='Os projetos neste estado serão movidos para outro estado do mesmo grupo. Essa ação não pode ser desfeita.'
            confirmLabel='Excluir'
            pendingLabel='Excluindo...'
            destructive
            pending={deleting}
            onConfirm={onDelete}
          />
        </div>
      )}
    </div>
  )
}
