'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getInitials } from '@/lib/user-name-initials'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { Combobox } from '../../ui/combobox'

const MAX_VISIBLE_ASSIGNEES = 3

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
        <Button
          variant={selected.length > 0 ? 'ghost' : 'outline'}
          size='xs'
          className={
            selected.length > 0 ? 'h-auto gap-1 px-1 py-0.5' : undefined
          }
        >
          {selected.length === 0 ? (
            'Responsáveis'
          ) : (
            <AvatarGroup>
              {selected.slice(0, MAX_VISIBLE_ASSIGNEES).map((member) => (
                <Avatar key={member.userId} size='sm'>
                  <AvatarImage
                    src={member.image ?? undefined}
                    alt={member.name}
                  />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
              ))}
              {selected.length > MAX_VISIBLE_ASSIGNEES && (
                <AvatarGroupCount>
                  +{selected.length - MAX_VISIBLE_ASSIGNEES}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </Button>
      }
      renderItem={(member, checked) => (
        <div className='w-full flex items-center justify-between'>
          <div className='flex items-center gap-1.5'>
            <Avatar size='sm'>
              <AvatarImage src={member.image ?? undefined} alt={member.name} />
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            {member.name}
          </div>
          {checked && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
        </div>
      )}
    />
  )
}
