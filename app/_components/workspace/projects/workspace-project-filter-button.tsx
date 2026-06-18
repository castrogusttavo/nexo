'use client'

import { FilterMailIcon } from '@hugeicons-pro/core-stroke-rounded'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQueryStates } from 'nuqs'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  accessParser,
  createdAtParser,
  dateFromParser,
  dateToParser,
  mineParser,
} from '@/src/lib/project-params'

export type CreatedAtPreset = 'today' | 'yesterday' | '7days' | '30days'

const PRESET_LABELS: Record<NonNullable<CreatedAtPreset>, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  '7days': 'Últimos 7 dias',
  '30days': 'Últimos 30 dias',
}

export function ProjectFilterButton() {
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [{ mine, access, createdAt, dateFrom, dateTo }, setFilters] =
    useQueryStates({
      mine: mineParser,
      access: accessParser,
      createdAt: createdAtParser,
      dateFrom: dateFromParser,
      dateTo: dateToParser,
    })

  const dateRange: DateRange | undefined = dateFrom
    ? { from: dateFrom, to: dateTo ?? undefined }
    : undefined

  const activeCount = [
    mine,
    access.length > 0,
    createdAt !== null || dateRange !== undefined,
  ].filter(Boolean).length

  function toggleAccess(value: 'public' | 'private') {
    const next = access.includes(value)
      ? access.filter((v) => v !== value)
      : [...access, value]
    setFilters({ access: next.length ? next : null })
  }

  function selectPreset(preset: CreatedAtPreset | null) {
    setFilters({
      createdAt: createdAt === preset ? null : preset,
      dateFrom: null,
      dateTo: null,
    })
  }

  function handleDateRange(range: DateRange | undefined) {
    setFilters({
      dateFrom: range?.from ?? null,
      dateTo: range?.to ?? null,
      createdAt: null,
    })
  }

  function formatDateRange() {
    if (!dateFrom) return 'Customizar'
    if (!dateTo) return format(dateFrom, 'dd/MM/yy', { locale: ptBR })
    return `${format(dateFrom, 'dd/MM/yy', { locale: ptBR })} – ${format(dateTo, 'dd/MM/yy', { locale: ptBR })}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='outline' size='xs'>
            <NexoIcon icon={FilterMailIcon} strokeWidth={2} />
            Filtros
            {activeCount > 0 && (
              <span className='ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 leading-4'>
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className='w-56 text-xs'>
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={mine}
            onCheckedChange={(v) => setFilters({ mine: v === true })}
          >
            <Checkbox checked={mine} className='size-3' />
            Meus projetos
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Acesso</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={access.includes('public')}
            onCheckedChange={() => toggleAccess('public')}
          >
            <Checkbox checked={access.includes('public')} className='size-3' />
            Público
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={access.includes('private')}
            onCheckedChange={() => toggleAccess('private')}
          >
            <Checkbox checked={access.includes('private')} className='size-3' />
            Privado
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Data de criação</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={createdAt ?? ''}
            onValueChange={(v) => selectPreset((v || null) as CreatedAtPreset)}
          >
            {(Object.keys(PRESET_LABELS) as CreatedAtPreset[]).map((preset) => (
              <DropdownMenuRadioItem key={preset} value={preset}>
                <RadioGroup
                  className='flex gap-2 items-center'
                  value={createdAt ?? ''}
                >
                  <RadioGroupItem value={preset} className='size-3' />
                  {PRESET_LABELS[preset]}
                </RadioGroup>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant='ghost'
                  className='w-full justify-start font-normal'
                  onClick={() => setFilters({ createdAt: null })}
                >
                  <RadioGroup
                    className='flex gap-2 items-center'
                    value={dateRange ? 'custom' : ''}
                  >
                    <RadioGroupItem value='custom' className='size-3' />
                    {formatDateRange()}
                  </RadioGroup>
                </Button>
              }
            />
            <PopoverContent className='w-auto p-0' align='start' side='right'>
              <Calendar
                mode='range'
                selected={dateRange}
                onSelect={handleDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
