import { Alert02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface RiskActionDialogProps {
  trigger: ReactNode
  title: string
  description: string
  onClick: () => void
  action: string
}

export function RiskActionDialog({
  trigger,
  title = 'Cancele seu teste primeiro',
  description = 'Este workspace tem um teste ativo de um plano pago. Cancele o teste para excluir o workspace.',
  onClick,
  action,
}: RiskActionDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant='destructive' />}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className='bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 p-2 items-center flex justify-center rounded-lg size-12'>
          <NexoIcon icon={Alert02Icon} strokeWidth={2} size={24} />
        </div>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size='sm'>Dispensar</AlertDialogCancel>
          <AlertDialogAction onClick={onClick} size='sm'>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
