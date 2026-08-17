'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { colorToText } from '@/lib/state-colors'
import { useLabels } from '@/src/hooks/use-label'
import { Combobox } from '../../ui/combobox'
import { issueLabelIcon as Tag01Icon } from '../issue-icons'

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
        <Button variant='outline' size='xs'>
          {selected.length === 0 ? (
            <>
              <NexoIcon icon={Tag01Icon} strokeWidth={2} />
              Etiqueta
            </>
          ) : selected.length === 1 ? (
            <>
              <NexoIcon
                icon={Tag01Icon}
                strokeWidth={2}
                className={colorToText(selected[0].color)}
              />
              {selected[0].name}
            </>
          ) : (
            <>
              <NexoIcon
                icon={Tag01Icon}
                strokeWidth={2}
                className={colorToText(selected[0].color)}
              />
              {selected.length} Etiquetas
            </>
          )}
        </Button>
      }
      renderItem={(label, isSelected) => (
        <div className='w-full flex items-center justify-between'>
          <div className='flex items-center gap-1.5'>
            <NexoIcon
              icon={Tag01Icon}
              strokeWidth={2}
              className={colorToText(label.color)}
            />
            {label.name}
          </div>
          {isSelected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
        </div>
      )}
    />
  )
}
