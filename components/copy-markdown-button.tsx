'use client'

import { Copy01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { ComponentProps } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'

type CopyMarkdownButtonProps = { markdown: string } & Omit<
  ComponentProps<typeof Button>,
  'onClick' | 'children'
>

export function CopyMarkdownButton({
  markdown,
  ...props
}: CopyMarkdownButtonProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      notify.success('Markdown copiado para a área de transferência')
    } catch {
      notify.error(undefined, 'Não foi possível copiar o markdown')
    }
  }

  return (
    <Button {...props} onClick={handleCopy}>
      <NexoIcon icon={Copy01Icon} strokeWidth={2} />
      Copy as markdown
    </Button>
  )
}