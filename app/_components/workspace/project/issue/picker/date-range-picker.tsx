import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getDueDateColorClass } from '@/lib/issue-due-date'
import { parseIssueDate, toIssueDateISO } from '../issue-dates'

interface DateRangePickerProps {
  startDate: string | null
  dueDate: string | null
  onChange: (range: {
    startDate: string | null
    dueDate: string | null
  }) => void
}

export function DateRangePicker({
  startDate,
  dueDate,
  onChange,
}: DateRangePickerProps) {
  const start = startDate ? parseIssueDate(startDate) : undefined
  const due = dueDate ? parseIssueDate(dueDate) : undefined
  const label =
    start && due
      ? `${start.toLocaleDateString('pt-BR')} - ${due.toLocaleDateString('pt-BR')}`
      : start
        ? `A partir de ${start.toLocaleDateString('pt-BR')}`
        : due
          ? `Até ${due.toLocaleDateString('pt-BR')}`
          : 'Datas'

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            size='xs'
            // It compares local calendar days, so it gets the normalised day.
            className={getDueDateColorClass(due?.toISOString() ?? null)}
          >
            {label}
          </Button>
        }
      />
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='range'
          selected={{
            from: start,
            to: due,
          }}
          onSelect={(range) =>
            onChange({
              startDate: range?.from ? toIssueDateISO(range.from) : null,
              dueDate: range?.to ? toIssueDateISO(range.to) : null,
            })
          }
        />
      </PopoverContent>
    </Popover>
  )
}
