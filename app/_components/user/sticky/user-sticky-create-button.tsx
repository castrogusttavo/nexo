'use client'

import { Add01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { ComponentProps } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { useCreateStickyNote } from '@/src/hooks/use-sticky-note'

type ButtonProps = ComponentProps<typeof Button>

interface UserStickyCreateButtonProps {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  label?: string
}

export function UserStickyCreateButton({
  variant = 'link',
  size = 'xs',
  label = 'Adicionar sticky',
}: UserStickyCreateButtonProps) {
  const create = useCreateStickyNote()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() =>
        notify.mutate(create.mutateAsync(undefined), {
          loading: 'Criando sticky...',
          success: 'Sticky criado',
          error: 'Erro ao criar sticky',
        })
      }
      disabled={create.isPending}
    >
      <NexoIcon icon={Add01Icon} strokeWidth={2} />
      {label}
    </Button>
  )
}
