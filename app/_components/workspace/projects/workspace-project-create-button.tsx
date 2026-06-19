'use client'

import { Add01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { ComponentProps } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

type ButtonProps = ComponentProps<typeof Button>

interface ProjectCreateButtonProps {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  label?: string
}

export function ProjectCreateButton({
  variant = 'link',
  size = 'xs',
  label = 'Adicionar sticky',
  ...props
}: ProjectCreateButtonProps) {
  return (
    <Button variant={variant} size={size} {...props}>
      <NexoIcon icon={Add01Icon} strokeWidth={2} />
      {label}
    </Button>
  )
}
