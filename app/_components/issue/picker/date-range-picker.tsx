import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getDueDateColorClass } from '@/lib/issue-due-date'

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
  const label =
    startDate && dueDate
      ? `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(dueDate).toLocaleDateString('pt-BR')}`
      : startDate
        ? `A partir de ${new Date(startDate).toLocaleDateString('pt-BR')}`
        : dueDate
          ? `Até ${new Date(dueDate).toLocaleDateString('pt-BR')}`
          : 'Datas'

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            size='xs'
            className={getDueDateColorClass(dueDate)}
          >
            {label}
          </Button>
        }
      />
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='range'
          selected={{
            from: startDate ? new Date(startDate) : undefined,
            to: dueDate ? new Date(dueDate) : undefined,
          }}
          onSelect={(range) =>
            onChange({
              startDate: range?.from ? range.from.toISOString() : null,
              dueDate: range?.to ? range.to.toISOString() : null,
            })
          }
        />
      </PopoverContent>
    </Popover>
  )
}
