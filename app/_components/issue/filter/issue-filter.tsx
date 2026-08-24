'use client'

import {
  CheckIcon,
  FilterMailIcon,
  TextAlignLeftIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Combobox } from '../../ui/combobox'

const FILTER_OPTIONS = [
  { value: 'title', label: 'Título', icon: TextAlignLeftIcon },
  { value: 'description', label: 'Descrição', icon: TextAlignLeftIcon },
  { value: 'issue', label: 'Issue', icon: TextAlignLeftIcon },
  { value: 'parent', label: 'Parente', icon: TextAlignLeftIcon },
  { value: 'state', label: 'Estado', icon: TextAlignLeftIcon },
  { value: 'state-group', label: 'Grupo de Estado', icon: TextAlignLeftIcon },
  { value: 'assignees', label: 'Responsável', icon: TextAlignLeftIcon },
  { value: 'priority', label: 'Prioridade', icon: TextAlignLeftIcon },
  { value: 'mentions', label: 'Menções', icon: TextAlignLeftIcon },
  { value: 'label', label: 'Etiqueta', icon: TextAlignLeftIcon },
  { value: 'cycle', label: 'Ciclo', icon: TextAlignLeftIcon },
  { value: 'module', label: 'Módulo', icon: TextAlignLeftIcon },
  { value: 'start-date', label: 'Data de início', icon: TextAlignLeftIcon },
  { value: 'due-date', label: 'Data de vencimento', icon: TextAlignLeftIcon },
  { value: 'created-at', label: 'Criado em', icon: TextAlignLeftIcon },
  { value: 'updated-at', label: 'Atualizado em', icon: TextAlignLeftIcon },
  { value: 'created-by', label: 'Criado por', icon: TextAlignLeftIcon },
]

export function IssueFilterDropdown() {
  const [value, setValue] = useState<string | undefined>(undefined)
  const selected = FILTER_OPTIONS.find((option) => option.value === value)

  return (
    <Combobox
      options={FILTER_OPTIONS}
      getValue={(option) => option.value}
      getSearchText={(option) => option.label}
      value={value}
      onChange={setValue}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant='outline' size='icon-sm' className='h-8'>
          {selected ? (
            <>
              <NexoIcon icon={selected.icon} strokeWidth={2} />
              {selected.label}
            </>
          ) : (
            <NexoIcon icon={FilterMailIcon} strokeWidth={2} />
          )}
        </Button>
      }
      renderItem={(option, isSelected) => (
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-1.5'>
            <NexoIcon icon={option.icon} strokeWidth={2} />
            {option.label}
          </div>
          {isSelected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
        </div>
      )}
    />
  )
}
