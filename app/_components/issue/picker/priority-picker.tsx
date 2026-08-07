'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { PRIORITY_ICONS } from '@/lib/priority-icons'
import type { IssuePriorityDTO } from '@/types/issue'
import { Combobox } from '../../ui/combobox'

interface PriorityPickerProps {
  value: IssuePriorityDTO | undefined
  onChange: (stateId: IssuePriorityDTO) => void
}

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const selected = PRIORITY_ICONS.find((priority) => priority.value === value)

  return (
    <Combobox
      options={PRIORITY_ICONS}
      getValue={(priority) => priority.value}
      getSearchText={(priority) => priority.label}
      value={value}
      onChange={(next) => onChange(next as IssuePriorityDTO)}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected ? (
            <>
              <NexoIcon icon={selected.icon} strokeWidth={2} />
              {selected.label}
            </>
          ) : (
            'Prioridade'
          )}
        </Button>
      }
      renderItem={(priority) => (
        <div className='flex items-center gap-1.5'>
          <NexoIcon icon={priority.icon} strokeWidth={2} />
          {priority.label}
        </div>
      )}
    />
  )
}
