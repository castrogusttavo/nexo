import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { IssueProjectSwitcher } from '../issue-project-switcher'

interface IssueModalProps {
  trigger: ReactElement
  workspaceId: string
  workspaceSlug: string
  projectSlug: string
}

export function IssueModal({
  trigger,
  workspaceId,
  workspaceSlug,
  projectSlug,
}: IssueModalProps) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent
        className='rounded-lg w-4xl min-w-4xl h-128'
        showCloseButton={false}
      >
        <form className='w-full h-full'>
          <DialogHeader>
            <DialogTitle>Criar nova issue</DialogTitle>
            <IssueProjectSwitcher
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              projectSlug={projectSlug}
              buttonVariant='outline'
            />
          </DialogHeader>
          <div>
            <Input />
            <Textarea />
          </div>
          <div />
          <div className='flex items-center'>
            <Field orientation='horizontal' className='w-fit'>
              <Switch />
              <FieldLabel>Criar mais</FieldLabel>
            </Field>
            <Button variant='outline' size='xs' className='h-7'>
              Descartar
            </Button>
            <Button size='xs' className='h-7'>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
