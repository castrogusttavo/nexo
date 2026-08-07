'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { colorToText } from '@/lib/state-colors'
import { STATE_GROUP_ICON_MAP } from '@/lib/state-icons'
import { cn } from '@/lib/utils'
import { useStates } from '@/src/hooks/use-state'
import { Combobox } from '../../ui/combobox'

interface StatePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (stateId: string) => void
}

export function StatePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: StatePickerProps) {
  const { data: states } = useStates(workspaceId, projectSlug)
  const options = states ?? []
  const selected = options.find((state) => state.id === value)

  return (
    <Combobox
      options={options}
      getValue={(state) => state.id}
      getSearchText={(state) => state.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected ? (
            <>
              <NexoIcon
                icon={STATE_GROUP_ICON_MAP[selected.group].icon}
                strokeWidth={STATE_GROUP_ICON_MAP[selected.group].strokeWidth}
                className={cn(colorToText(selected.color))}
              />
              {selected.name}
            </>
          ) : (
            'Status'
          )}
        </Button>
      }
      renderItem={(state) => (
        <div className='flex items-center gap-1.5'>
          <NexoIcon
            icon={STATE_GROUP_ICON_MAP[state.group].icon}
            strokeWidth={STATE_GROUP_ICON_MAP[state.group].strokeWidth}
            className={cn(colorToText(state.color))}
          />
          {state.name}
        </div>
      )}
    />
  )
}
