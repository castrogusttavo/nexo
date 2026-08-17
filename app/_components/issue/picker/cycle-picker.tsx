'use client'

import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { useCycles } from '@/src/hooks/use-cycle'
import { Combobox } from '../../ui/combobox'
import { issueCyclesIcon } from '../issue-icons'

const NONE_VALUE = '__none__'

interface CyclePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (cycleId: string | undefined) => void
}

export function CyclePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: CyclePickerProps) {
  const { data: cycles } = useCycles(workspaceId, projectSlug)
  const options = [{ id: NONE_VALUE, name: 'Nenhum ciclo' }, ...(cycles ?? [])]
  const selectedValue = value ?? NONE_VALUE
  const selected = options.find((cycle) => cycle.id === selectedValue)
  const selectedStatusIcon =
    selected && 'status' in selected
      ? issueCyclesIcon.find((status) => status.status === selected.status)
      : undefined

  return (
    <Combobox
      options={options}
      getValue={(cycle) => cycle.id}
      getSearchText={(cycle) => cycle.name}
      value={selectedValue}
      onChange={(cycleId) =>
        onChange(cycleId === NONE_VALUE ? undefined : cycleId)
      }
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='xs'>
          {selectedStatusIcon && (
            <NexoIcon
              icon={selectedStatusIcon.icon}
              strokeWidth={selectedStatusIcon.strokeWidth}
              className={selectedStatusIcon.color}
            />
          )}
          {!selected || selected.id === NONE_VALUE ? 'Ciclo' : selected.name}
        </Button>
      }
      renderItem={(cycle) => {
        const statusIcon =
          'status' in cycle
            ? issueCyclesIcon.find((status) => status.status === cycle.status)
            : undefined
        return (
          <div className='flex items-center gap-1.5'>
            {statusIcon && (
              <NexoIcon
                icon={statusIcon.icon}
                strokeWidth={statusIcon.strokeWidth}
                className={statusIcon.color}
              />
            )}
            {cycle.name}
          </div>
        )
      }}
    />
  )
}
