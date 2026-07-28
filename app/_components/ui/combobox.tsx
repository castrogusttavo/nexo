'use client'

import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ComboboxBaseProps<T> {
  options: T[]
  getValue: (item: T) => string
  getSearchText: (item: T) => string
  renderItem: (item: T, selected: boolean) => ReactNode
  trigger: ReactElement
  searchPlaceholder?: string
  emptyMessage?: string
  align?: 'start' | 'end' | 'center'
  contentClassName?: string
}

interface SingleComboboxProps<T> extends ComboboxBaseProps<T> {
  multiple?: false
  value: string | undefined
  onChange: (value: string) => void
}

interface MultiComboboxProps<T> extends ComboboxBaseProps<T> {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

export function Combobox<T>(
  props: SingleComboboxProps<T> | MultiComboboxProps<T>,
) {
  const [open, setOpen] = useState(false)
  const {
    options,
    getValue,
    getSearchText,
    renderItem,
    trigger,
    searchPlaceholder = 'Pesquisar...',
    emptyMessage = 'Nenhum resultado encontrado.',
    align = 'start',
    contentClassName,
  } = props

  function isSelected(itemValue: string) {
    return props.multiple
      ? props.value.includes(itemValue)
      : props.value === itemValue
  }

  function handleSelect(itemValue: string) {
    if (props.multiple) {
      const next = new Set(props.value)
      if (next.has(itemValue)) next.delete(itemValue)
      else next.add(itemValue)
      props.onChange(Array.from(next))
      return
    }
    props.onChange(itemValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align={align}
        className={cn('w-64 p-0', contentClassName)}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((item) => {
                const itemValue = getValue(item)
                return (
                  <CommandItem
                    key={itemValue}
                    value={getSearchText(item)}
                    onSelect={() => handleSelect(itemValue)}
                  >
                    {renderItem(item, isSelected(itemValue))}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
