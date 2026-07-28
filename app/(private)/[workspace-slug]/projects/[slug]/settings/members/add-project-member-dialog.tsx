'use client'

import { useState } from 'react'
import { Combobox } from '@/app/_components/ui/combobox'
import { Muted } from '@/components/typography/text/muted'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
import { useMembers } from '@/src/hooks/use-member'
import { useAddProjectMember } from '@/src/hooks/use-project-member'

const MAX_VISIBLE_AVATARS = 4

interface AddProjectMemberDialogProps {
  workspaceId: string
  projectSlug: string
  currentMemberIds: string[]
}

export function AddProjectMemberDialog({
  workspaceId,
  projectSlug,
  currentMemberIds,
}: AddProjectMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data } = useMembers(workspaceId, {
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  })
  const addMember = useAddProjectMember(workspaceId, projectSlug)

  const available = (data?.members ?? []).filter(
    (m) => !currentMemberIds.includes(m.userId),
  )
  const membersById = new Map(available.map((m) => [m.userId, m]))
  const selectedMembers = selectedIds
    .map((id) => membersById.get(id))
    .filter((m): m is NonNullable<typeof m> => !!m)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSelectedIds([])
  }

  async function handleConfirm() {
    async function run() {
      for (const userId of selectedIds) {
        await addMember.mutateAsync(userId)
      }
    }
    try {
      await notify.mutate(run(), {
        loading: 'Adicionando membros...',
        success: 'Membros adicionados',
        error: 'Erro ao adicionar membros',
      })
      handleOpenChange(false)
    } catch {
      // toast já mostrou o erro
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size='sm'>Adicionar membro</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membros</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          <Muted>Convide membros para trabalhar em seu projeto.</Muted>
          <Combobox
            multiple
            options={available}
            getValue={(m) => m.userId}
            getSearchText={(m) => `${m.name} ${m.username}`}
            value={selectedIds}
            onChange={setSelectedIds}
            searchPlaceholder='Procurar membro...'
            emptyMessage='Nenhum membro disponível.'
            trigger={
              <Button variant='outline' className='w-full justify-start'>
                {selectedIds.length > 0
                  ? `${selectedIds.length} membro${selectedIds.length === 1 ? '' : 's'} selecionado${selectedIds.length === 1 ? '' : 's'}`
                  : 'Selecionar membros'}
              </Button>
            }
            renderItem={(member, isSelected) => (
              <>
                <Checkbox checked={isSelected} className='mr-1' />
                <Avatar size='sm'>
                  <AvatarImage src={member.image || ''} alt={member.name} />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <span className='flex-1'>@{member.username}</span>
              </>
            )}
          />
          {selectedMembers.length > 0 && (
            <AvatarGroup>
              {selectedMembers.slice(0, MAX_VISIBLE_AVATARS).map((m) => (
                <Avatar key={m.userId} size='sm'>
                  <AvatarImage src={m.image || ''} alt={m.name} />
                  <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
              {selectedMembers.length > MAX_VISIBLE_AVATARS && (
                <AvatarGroupCount>
                  +{selectedMembers.length - MAX_VISIBLE_AVATARS}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={selectedIds.length === 0 || addMember.isPending}
            onClick={handleConfirm}
          >
            Adicionar membro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
