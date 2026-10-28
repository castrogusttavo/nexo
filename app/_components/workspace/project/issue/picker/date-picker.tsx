'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  label: string
  value: string | null
  onChange: (date: string | null) => void
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='secondary' size='sm' className='h-8'>
            {value ? new Date(value).toLocaleDateString('pt-BR') : label}
          </Button>
        }
      />
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='single'
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => onChange(date ? date.toISOString() : null)}
        />
      </PopoverContent>
    </Popover>
  )
}
