'use client'

import { ArrowDown01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/app/_components/ui/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface FacetedFilterOption {
  label: string
  value: string
}

interface DataTableFacetedFilterProps {
  title: string
  options: FacetedFilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function DataTableFacetedFilter({
  title,
  options,
  selected,
  onChange,
}: DataTableFacetedFilterProps) {
  return (
    <Combobox
      multiple
      options={options}
      getValue={(o) => o.value}
      getSearchText={(o) => o.label}
      value={selected}
      onChange={onChange}
      searchPlaceholder={title}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-48'
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {title}
          <NexoIcon icon={ArrowDown01Icon} />
          {selected.length > 0 && (
            <Badge
              variant='secondary'
              className='ml-1 rounded-sm px-1 font-normal'
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      }
      renderItem={(option, isSelected) => (
        <>
          <Checkbox checked={isSelected} className='mr-2' />
          {option.label}
        </>
      )}
    />
  )
}
