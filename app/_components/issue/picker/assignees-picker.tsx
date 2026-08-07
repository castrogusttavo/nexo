'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/user-name-initials'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { Combobox } from '../../ui/combobox'

interface AssigneesPickerProps {
  workspaceId: string
  projectSlug: string
  value: string[]
  onChange: (userIds: string[]) => void
}

export function AssigneesPicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: AssigneesPickerProps) {
  const { data: members } = useProjectMembers(workspaceId, projectSlug)
  const options = members ?? []
  const selected = options.filter((member) => value?.includes(member.userId))

  return (
    <Combobox
      multiple
      options={options}
      getValue={(member) => member.userId}
      getSearchText={(member) => member.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected.length === 0
            ? 'Responsáveis'
            : selected.length === 1
              ? selected[0].name
              : `Responsáveis (${selected.length})`}
        </Button>
      }
      renderItem={(member) => (
        <div className='flex items-center gap-1.5'>
          <Avatar size='sm'>
            <AvatarImage src={member.image ?? undefined} alt={member.name} />
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          {member.name}
        </div>
      )}
    />
  )
}
