'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatIssueDay, parseIssueDate, toIssueDateISO } from '../issue-dates'

interface DatePickerProps {
  label: string
  value: string | null
  onChange: (date: string | null) => void
}

// `value` is an issue date: a calendar day stored as UTC midnight. Reading
// it with new Date() showed the day before west of UTC, and saving
// date.toISOString() stored the picker's local midnight instead of the day.
export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const day = value ? parseIssueDate(value) : undefined
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='secondary' size='sm' className='h-8'>
            {day ? formatIssueDay(day) : label}
          </Button>
        }
      />
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='single'
          selected={day}
          onSelect={(date) => onChange(date ? toIssueDateISO(date) : null)}
        />
      </PopoverContent>
    </Popover>
  )
}
