import { type SyntheticEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notify } from '@/lib/notify'
import { useCreateInvitation } from '@/src/hooks/use-invitation'
import { InvitableRoleValues } from '@/src/schemas/invitation.schema'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

export function WorkspaceSettingsMemberInviteDialog({
  workspaceId,
}: {
  workspaceId: string
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')

  const createInvitation = useCreateInvitation(workspaceId)

  async function handleInvite(event: SyntheticEvent) {
    event.preventDefault()

    try {
      await notify.mutate(createInvitation.mutateAsync({ email, role }), {
        loading: 'Enviando convite...',
        success: 'Convite enviado',
        error: 'Não foi possível enviar o convite',
      })
      setEmail('')
      setOpen(false)
    } catch {
      //
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size='xs' className='h-8' />}>
        Adicionar membro
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            Envie um convite por e-mail para o workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className='flex items-center gap-2'>
          <Input
            type='email'
            required
            placeholder='email@exemplo.com'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={createInvitation.isPending}
            className='max-w-xs'
          />
          <Select
            value={role}
            onValueChange={(value) => setRole(value ?? 'MEMBER')}
          >
            <SelectTrigger className='w-44'>
              <SelectValue placeholder='Papel' />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {InvitableRoleValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABEL[value] ?? value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type='submit' disabled={createInvitation.isPending || !email}>
            Convidar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
