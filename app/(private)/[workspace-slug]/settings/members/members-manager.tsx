'use client'

import { type FormEvent, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { notify } from '@/lib/notify'
import {
  useCreateInvitation,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from '@/src/hooks/use-invitation'
import { InvitableRoleValues } from '@/src/schemas/invitation.schema'

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceito',
  REVOKED: 'Revogado',
  EXPIRED: 'Expirado',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

export function MembersManager({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')

  const { data: invitations, isLoading } = useInvitations(workspaceId)
  const createInvitation = useCreateInvitation(workspaceId)
  const resendInvitation = useResendInvitation(workspaceId)
  const revokeInvitation = useRevokeInvitation(workspaceId)

  function handleInvite(event: FormEvent) {
    event.preventDefault()

    createInvitation.mutate(
      { email, role },
      {
        onSuccess: () => {
          notify.success('Convite enviado')
          setEmail('')
        },
        onError: (error) =>
          notify.error(error, 'Não foi possível enviar o convite'),
      },
    )
  }

  function handleResend(invitationId: string) {
    resendInvitation.mutate(invitationId, {
      onSuccess: () => notify.success('Convite reenviando'),
      onError: (error) =>
        notify.error(error, 'Não foi possível reenviar o convite'),
    })
  }

  function handleRevoke(invitationId: string) {
    resendInvitation.mutate(invitationId, {
      onSuccess: () => notify.success('Convite revogado'),
      onError: (error) =>
        notify.error(error, 'Não foi possível revogar o convite'),
    })
  }

  return (
    <div className='space-y-6'>
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
          {createInvitation.isPending ? 'Enviando...' : 'Convidar'}
        </Button>
      </form>

      {isLoading ? (
        <Muted>Carregando convites...</Muted>
      ) : !invitations || invitations.length === 0 ? (
        <Muted>Nenhum convite ainda.</Muted>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className='text-right'>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => {
              const isPending = invitation.status === 'PENDING'

              return (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    {ROLE_LABEL[invitation.role] ?? invitation.role}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isPending ? 'default' : 'secondary'}>
                      {STATUS_LABEL[invitation.status] ?? invitation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {dateFmt.format(new Date(invitation.expiresAt))}
                  </TableCell>
                  <TableCell className='text-right space-x-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={
                        invitation.status === 'ACCEPTED' ||
                        invitation.status === 'REVOKED' ||
                        resendInvitation.isPending
                      }
                      onClick={() => handleResend(invitation.id)}
                    >
                      Reenviar
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={!isPending || revokeInvitation.isPending}
                      onClick={() => handleRevoke(invitation.id)}
                    >
                      Revogar
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
