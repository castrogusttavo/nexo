'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'
import type { ProjectMemberDTO } from '@/types/project'

interface ProjectLeadSelectProps {
  workspaceId: string
  projectSlug: string
  members: ProjectMemberDTO[]
  canManage: boolean
}

export function ProjectLeadSelect({
  workspaceId,
  projectSlug,
  members,
  canManage,
}: ProjectLeadSelectProps) {
  const [open, setOpen] = useState(false)
  const { data: project } = useProject(workspaceId, projectSlug)
  const updateProject = useUpdateProject(workspaceId, projectSlug)

  const currentLead = members.find((m) => m.userId === project?.leadId)

  function handleSelect(userId: string) {
    setOpen(false)
    if (userId === project?.leadId) return
    updateProject.mutate(
      { leadId: userId },
      {
        onSuccess: () => notify.success('Líder do projeto atualizado'),
        onError: notify.error,
      },
    )
  }

  return (
    <div className='w-full flex items-center justify-between'>
      <div className='space-y-1'>
        <span className='text-sm font-medium'>Líder do projeto</span>
        <Muted className='text-xs'>Selecione o líder do projeto</Muted>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant='outline'
              size='sm'
              disabled={!canManage || updateProject.isPending}
              className='justify-start'
            >
              {currentLead ? (
                <span className='flex items-center gap-2'>
                  <Avatar size='sm'>
                    <AvatarImage
                      src={currentLead.image || ''}
                      alt={currentLead.name}
                    />
                    <AvatarFallback>
                      {getInitials(currentLead.name)}
                    </AvatarFallback>
                  </Avatar>
                  @{currentLead.username}
                </span>
              ) : (
                'Selecionar líder do projeto'
              )}
            </Button>
          }
        />
        <PopoverContent align='end' className='w-64 p-0'>
          <Command className='space-y-2'>
            <CommandInput placeholder='Procurar membro...' />
            <CommandList>
              <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              <CommandGroup>
                {members.map((member) => (
                  <CommandItem
                    key={member.userId}
                    value={`${member.name} ${member.username}`}
                    onSelect={() => handleSelect(member.userId)}
                  >
                    <Avatar size='sm'>
                      <AvatarImage src={member.image || ''} alt={member.name} />
                      <AvatarFallback>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className='flex-1'>@{member.username}</span>
                    {member.userId === project?.leadId && (
                      <NexoIcon icon={CheckIcon} strokeWidth={2} />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
