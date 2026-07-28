'use client'

import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
import { useMembers } from '@/src/hooks/use-member'
import { useAddProjectMember } from '@/src/hooks/use-project-member'
import type { MemberDTO } from '@/types/member'

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
  const [slots, setSlots] = useState<string[]>([''])

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

  const selectedIds = slots.filter(Boolean)
  const selectedMembers = selectedIds
    .map((id) => membersById.get(id))
    .filter((m): m is MemberDTO => !!m)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSlots([''])
  }

  function handleSlotChange(index: number, userId: string) {
    setSlots((prev) => prev.map((v, i) => (i === index ? userId : v)))
  }

  function handleRemoveSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddSLot() {
    setSlots((prev) => [...prev, ''])
  }

  async function handleConfirm() {
    try {
      for (const userId of selectedIds) {
        await addMember.mutateAsync(userId)
      }
      notify.success('Membros adicionados')
      handleOpenChange(false)
    } catch (err) {
      notify.error(err)
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
          <div className='space-y-2'>
            {slots.map((value, index) => {
              const chosenElsewhere = slots.filter((_, i) => i !== index)
              const options = available.filter(
                (m) =>
                  m.userId === value || !chosenElsewhere.includes(m.userId),
              )
              const selected = value ? membersById.get(value) : undefined

              return (
                <div key={index} className='flex items-center gap-2'>
                  <Select
                    value={value || undefined}
                    onValueChange={(v) => v && handleSlotChange(index, v)}
                  >
                    <SelectTrigger className='flex-1'>
                      <SelectValue>
                        {selected ? (
                          <span className='flex items-center gap-2'>
                            <Avatar size='sm'>
                              <AvatarImage
                                src={selected.image || ''}
                                alt={selected.name}
                              />
                              <AvatarFallback>
                                {getInitials(selected.name)}
                              </AvatarFallback>
                            </Avatar>
                          </span>
                        ) : (
                          <Muted>Selecionar membro</Muted>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {options.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            <Avatar size='sm'>
                              <AvatarImage src={m.image || ''} alt={m.name} />
                              <AvatarFallback>
                                {getInitials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            @{m.username}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {slots.length > 1 && (
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      onClick={() => handleRemoveSlot(index)}
                    >
                      <NexoIcon icon={Cancel01Icon} />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
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
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleAddSLot}
            disabled={slots.length >= available.length}
          >
            Adicionar mais
          </Button>
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
            {addMember.isPending ? 'Adicionando...' : 'Adicionar membro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
