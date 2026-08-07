'use client'

import { Button } from '@/components/ui/button'
import { useCycles } from '@/src/hooks/use-cycle'
import { Combobox } from '../../ui/combobox'

interface CyclePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (cycleId: string) => void
}

export function CyclePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: CyclePickerProps) {
  const { data: cycles } = useCycles(workspaceId, projectSlug)
  const options = cycles ?? []
  const selected = options.find((cycle) => cycle.id === value)

  return (
    <Combobox
      options={options}
      getValue={(cycle) => cycle.id}
      getSearchText={(cycle) => cycle.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected?.name ?? 'Ciclo'}
        </Button>
      }
      renderItem={(cycle) => cycle.name}
    />
  )
}
