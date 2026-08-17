'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import type { IssuePriorityDTO } from '@/types/issue'
import { Combobox } from '../../ui/combobox'
import { issuePrioritiesIcon } from '../issue-icons'

interface PriorityPickerProps {
  value: IssuePriorityDTO | undefined
  onChange: (stateId: IssuePriorityDTO) => void
}

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const selected = issuePrioritiesIcon.find(
    (priority) => priority.priority === value,
  )

  return (
    <Combobox
      options={issuePrioritiesIcon}
      getValue={(priority) => priority.priority}
      getSearchText={(priority) => priority.label}
      value={value}
      onChange={(next) => onChange(next as IssuePriorityDTO)}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='xs'>
          {selected ? (
            <>
              <NexoIcon
                icon={selected.icon}
                strokeWidth={selected.strokeWidth}
                className={selected.color}
              />
              {selected.label}
            </>
          ) : (
            'Prioridade'
          )}
        </Button>
      }
      renderItem={(priority) => (
        <div className='flex items-center gap-1.5'>
          <NexoIcon
            icon={priority.icon}
            strokeWidth={priority.strokeWidth}
            className={priority.color}
          />
          {priority.label}
        </div>
      )}
    />
  )
}
