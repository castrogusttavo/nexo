'use client'

import { ArrowDown01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
import {
  useInvitations,
  useRevokeInvitation,
  useUpdateInvitationRole,
} from '@/src/hooks/use-invitation'
import { InvitableRoleValues } from '@/src/schemas/invitation.schema'

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

export function PendingInvitationsList({
  workspaceId,
}: {
  workspaceId: string
}) {
  const { data: invitations, isLoading } = useInvitations(workspaceId)
  const revokeInvitation = useRevokeInvitation(workspaceId)
  const updateRole = useUpdateInvitationRole(workspaceId)

  const pending = (invitations ?? []).filter(
    (invitation) => invitation.status === 'PENDING',
  )

  function handleRevoke(invitationId: string) {
    notify.mutate(revokeInvitation.mutateAsync(invitationId), {
      loading: 'Excluindo convite...',
      success: 'Convite excluído',
      error: 'Não foi possível excluir o convite',
    })
  }

  function handleRoleChange(invitationId: string, role: string) {
    notify.mutate(updateRole.mutateAsync({ invitationId, role }), {
      loading: 'Atualizando papel...',
      success: 'Papel do convite atualizado',
      error: 'Não foi possível atualizar o papel',
    })
  }

  if (isLoading) {
    return (
      <div className='space-y-2'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-10 w-full rounded-sm' />
      </div>
    )
  }
  if (pending.length === 0) return null

  return (
    <div className='shrink-0 space-y-2'>
      <div className='flex gap-2 items-center'>
        <Muted className='text-base text-primary'>Convites pendentes</Muted>
        <Badge variant='info'>{invitations?.length}</Badge>
      </div>
      <div className='max-h-48 overflow-y-auto divide-y'>
        {pending.map((invitation) => (
          <div
            key={invitation.id}
            className='flex items-center justify-between gap-2 px-3 py-4 hover:bg-accent/30 rounded-sm'
          >
            <div className='flex items-center gap-4'>
              <Avatar size='lg'>
                <AvatarFallback>{getInitials(invitation.email)}</AvatarFallback>
              </Avatar>
              <Muted className='text-primary'>{invitation.email}</Muted>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='warning'>{STATUS_LABEL[invitation.status]}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant='ghost' size='sm' className='h-7' />}
                >
                  {ROLE_LABEL[invitation.role] ?? invitation.role}
                  <NexoIcon icon={ArrowDown01Icon} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {InvitableRoleValues.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleChange(invitation.id, role)}
                    >
                      {ROLE_LABEL[role]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant='ghost'
                size='sm'
                className='h-7'
                disabled={revokeInvitation.isPending}
                onClick={() => handleRevoke(invitation.id)}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
