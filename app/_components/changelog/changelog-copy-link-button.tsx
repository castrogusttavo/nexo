'use client'

import { LinkIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { notify } from '@/lib/notify'

export function ChangelogCopyLinkButton({ path }: { path: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).toString(),
      )
      notify.success('Link copiado para a área de transferência')
    } catch {
      notify.error(undefined, 'Não foi possível copiar o link')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='outline'
            size='icon-lg'
            aria-label='Copiar link'
            onClick={handleCopy}
          >
            <NexoIcon icon={LinkIcon} strokeWidth={2} />
          </Button>
        }
      />
      <TooltipContent side='bottom'>Copiar link</TooltipContent>
    </Tooltip>
  )
}
