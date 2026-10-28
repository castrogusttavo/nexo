import { ArrowLeft01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'

// The title every step of the estimates dialog shares; the inner steps add
// "Voltar" to return to the menu.
export function EstimateDialogHeader({ onBack }: { onBack?: () => void }) {
  return (
    <DialogHeader className='flex-row items-center'>
      {onBack && (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='Voltar'
          onClick={onBack}
        >
          <NexoIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
      )}
      <DialogTitle>Editar sistema de estimativas</DialogTitle>
    </DialogHeader>
  )
}
