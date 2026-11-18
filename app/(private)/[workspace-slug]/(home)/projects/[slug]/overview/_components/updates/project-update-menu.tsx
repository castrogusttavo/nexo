'use client'

import { MoreHorizontalCircle01Icon } from '@hugeicons-pro/core-solid-rounded'
import { EraserIcon, Pen01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ProjectUpdateMenuProps = {
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

export function ProjectUpdateMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ProjectUpdateMenuProps) {
  if (!canEdit && !canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size='icon-sm' variant='ghost'>
            <NexoIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
          </Button>
        }
      />
      <DropdownMenuContent className='min-w-auto w-auto max-w-auto'>
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <NexoIcon icon={Pen01Icon} strokeWidth={2} />
            Editar
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem variant='destructive' onClick={onDelete}>
            <NexoIcon icon={EraserIcon} strokeWidth={2} />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
