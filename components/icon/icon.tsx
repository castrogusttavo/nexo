import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

type IconProps = ComponentProps<typeof HugeiconsIcon>

export function NexoIcon({
  size = 16,
  color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <HugeiconsIcon
      size={size}
      color={color}
      {...rest}
    />
  )
}
