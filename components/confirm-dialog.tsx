import type { ReactElement, ReactNode } from 'react'
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

type ConfirmDialogProps = {
  /** The element that opens the dialog, e.g. a delete button. */
  trigger: ReactElement
  title: string
  description: ReactNode
  confirmLabel: string
  /** Shown on the confirm button while `pending`. */
  pendingLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
}

// The one "are you sure?" dialog: title, what happens, Cancelar and the
// action. Both buttons lock while the action runs.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : undefined}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
