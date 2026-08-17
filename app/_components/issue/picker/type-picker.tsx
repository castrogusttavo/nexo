'use client'

import { Button } from '@/components/ui/button'
import { useIssueTypes } from '@/src/hooks/use-issue-type'
import { Combobox } from '../../ui/combobox'

interface TypePickerProps {
  workspaceId: string
  projectSlug: string
  value: string | undefined
  onChange: (typeId: string) => void
}

export function TypePicker({
  workspaceId,
  projectSlug,
  value,
  onChange,
}: TypePickerProps) {
  const { data: types } = useIssueTypes(workspaceId, projectSlug)
  const options = types ?? []
  const selected = options.find((type) => type.id === value)

  return (
    <Combobox
      options={options}
      getValue={(type) => type.id}
      getSearchText={(type) => type.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected?.name ?? 'Tipo'}
        </Button>
      }
      renderItem={(type) => type.name}
    />
  )
}
