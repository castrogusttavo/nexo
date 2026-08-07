'use client'

import { Button } from '@/components/ui/button'
import { useModules } from '@/src/hooks/use-module'
import { Combobox } from '../../ui/combobox'

interface ModulePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (moduleId: string) => void
}

export function ModulePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: ModulePickerProps) {
  const { data: modules } = useModules(workspaceId, projectSlug)
  const options = modules ?? []
  const selected = options.find((module) => module.id === value)

  return (
    <Combobox
      options={options}
      getValue={(module) => module.id}
      getSearchText={(module) => module.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected?.name ?? 'Módulo'}
        </Button>
      }
      renderItem={(module) => module.name}
    />
  )
}
