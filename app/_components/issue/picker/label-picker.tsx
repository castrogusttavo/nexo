'use client'

import { Button } from '@/components/ui/button'
import { colorToDot } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useLabels } from '@/src/hooks/use-label'
import { Combobox } from '../../ui/combobox'

interface LabelPickerProps {
  workspaceId: string
  projectSlug: string
  value: string[]
  onChange: (labelId: string[]) => void
}

export function LabelPicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: LabelPickerProps) {
  const { data: labels } = useLabels(workspaceId, projectSlug)
  const options = labels ?? []
  const selected = options.filter((label) => value?.includes(label.id))

  return (
    <Combobox
      multiple
      options={options}
      getValue={(label) => label.id}
      getSearchText={(label) => label.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected.length === 0
            ? 'Etiquetas'
            : selected.length === 1
              ? selected[0].name
              : `Etiquetas (${selected.length})`}
        </Button>
      }
      renderItem={(label) => (
        <div className='flex items-center gap-1.5'>
          <span
            className={cn('size-2 rounded-full', colorToDot(label.color))}
          />
          {label.name}
        </div>
      )}
    />
  )
}
