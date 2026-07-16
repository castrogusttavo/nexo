'use client'

import { Copy01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'

interface CopyMarkdownButtonProps {
  markdown: string
}

export function CopyMarkdownButton({ markdown }: CopyMarkdownButtonProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      notify.success('Markdown copiado para a área de transferência')
    } catch {
      notify.error(undefined, 'Não foi possível copiar o markdown')
    }
  }

  return (
    <Button
      variant='secondary'
      size='sm'
      className='w-full'
      onClick={handleCopy}
    >
      <NexoIcon icon={Copy01Icon} />
      Copy as markdown
    </Button>
  )
}
