'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useModules } from '@/src/hooks/use-module'
import { Combobox } from '../../ui/combobox'
import { issueModulesIcon } from '../issue-icons'

const NONE_VALUE = '__none__'

interface ModulePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (moduleId: string | undefined) => void
}

export function ModulePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: ModulePickerProps) {
  const { data: modules } = useModules(workspaceId, projectSlug)
  const options = [
    { id: NONE_VALUE, name: 'Nenhum módulo' },
    ...(modules ?? []),
  ]
  const selectedValue = value ?? NONE_VALUE
  const selected = options.find((module) => module.id === selectedValue)

  return (
    <Combobox
      options={options}
      getValue={(module) => module.id}
      getSearchText={(module) => module.name}
      value={selectedValue}
      onChange={(moduleId) =>
        onChange(
          moduleId === NONE_VALUE || moduleId === '' ? undefined : moduleId,
        )
      }
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='xs'>
          <NexoIcon icon={issueModulesIcon} strokeWidth={2} />
          {!selected || selected.id === NONE_VALUE ? 'Módulo' : selected.name}
        </Button>
      }
      renderItem={(module, isSelected) => (
        <div className='w-full flex items-center justify-between'>
          <div className='flex items-center gap-1.5'>
            <NexoIcon icon={issueModulesIcon} strokeWidth={2} />
            {module.name}
          </div>
          {isSelected && (
            <NexoIcon icon={CheckIcon} strokeWidth={2} className='w-fit' />
          )}
        </div>
      )}
    />
  )
}
