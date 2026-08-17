'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useStates } from '@/src/hooks/use-state'
import { Combobox } from '../../ui/combobox'
import { issueStateIconMap } from '../issue-icons'

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
        <Button variant='outline' size='xs'>
          {selected ? (
            <>
              <NexoIcon
                icon={issueStateIconMap[selected.group].icon}
                strokeWidth={issueStateIconMap[selected.group].strokeWidth}
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
            icon={issueStateIconMap[state.group].icon}
            strokeWidth={issueStateIconMap[state.group].strokeWidth}
            className={cn(colorToText(state.color))}
          />
          {state.name}
        </div>
      )}
    />
  )
}
