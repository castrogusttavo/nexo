'use client'

import {
  formatIssueDay,
  parseIssueDate,
  toIssueDateISO,
} from '@/app/_components/workspace/project/issue/issue-dates'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCycles } from '@/src/hooks/use-cycle'
import { useIssues } from '@/src/hooks/use-issue'
import { useIssueTypes } from '@/src/hooks/use-issue-type'
import { useLabels } from '@/src/hooks/use-label'
import { useModules } from '@/src/hooks/use-module'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import { FILTER_FIELDS } from './field-registry'
import type {
  BasicFilterValue,
  BasicOperator,
  FilterField,
} from './filter-schema'
import { IssueFilterSelect } from './issue-filter-select'

// Date filters name calendar days, stored like issue dates (UTC midnight of
// the picked day) so a filter reads the same day in every timezone.
function toFilterDay(iso: string): Date | undefined {
  return iso ? parseIssueDate(iso) : undefined
}

const PRIORITY_OPTIONS = [
  { label: 'Sem prioridade', value: 'NONE' },
  { label: 'Baixa', value: 'LOW' },
  { label: 'Média', value: 'MEDIUM' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Urgente', value: 'URGENT' },
]

const STATE_GROUP_OPTIONS = [
  { label: 'Backlog', value: 'BACKLOG' },
  { label: 'Não iniciado', value: 'UNSTARTED' },
  { label: 'Em andamento', value: 'STARTED' },
  { label: 'Concluído', value: 'COMPLETED' },
  { label: 'Cancelado', value: 'CANCELLED' },
]

interface IssueFilterValueInputProps {
  workspaceId: string
  projectSlug: string
  field: FilterField
  operator: BasicOperator
  value: BasicFilterValue
  onChange: (value: BasicFilterValue) => void
}

interface FilterOption {
  label: string
  value: string
}

const byId = (items?: { id: string; name: string }[]): FilterOption[] =>
  (items ?? []).map((item) => ({ label: item.name, value: item.id }))

function useFieldOptions(
  field: FilterField,
  workspaceId: string,
  projectSlug: string,
): FilterOption[] {
  const states = useStates(workspaceId, projectSlug)
  const types = useIssueTypes(workspaceId, projectSlug)
  const labels = useLabels(workspaceId, projectSlug)
  const cycles = useCycles(workspaceId, projectSlug)
  const modules = useModules(workspaceId, projectSlug)
  const members = useProjectMembers(workspaceId, projectSlug)
  const issues = useIssues(workspaceId, projectSlug)

  const toMembers = () =>
    (members.data ?? []).map((m) => ({ label: m.name, value: m.userId }))
  // Thunks, so only the requested field's list is mapped.
  const sources: Partial<Record<FilterField, () => FilterOption[]>> = {
    state: () => byId(states.data),
    type: () => byId(types.data),
    labels: () => byId(labels.data),
    cycle: () => byId(cycles.data),
    module: () => byId(modules.data),
    assignees: toMembers,
    mentions: toMembers,
    'created-by': toMembers,
    'sub-issues': () =>
      (issues.data ?? []).map((i) => ({ label: i.title, value: i.id })),
    priority: () => PRIORITY_OPTIONS,
    'state-group': () => STATE_GROUP_OPTIONS,
  }
  return sources[field]?.() ?? []
}

export function IssueFilterValueInput({
  operator,
  value,
  onChange,
  ...props
}: IssueFilterValueInputProps) {
  if (operator === 'is-empty') return null

  switch (FILTER_FIELDS[props.field].type) {
    case 'text':
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Valor'
          className='h-8 w-48'
        />
      )
    case 'date':
      return operator === 'between' || operator === 'not-between' ? (
        <FilterDateRangeInput value={value} onChange={onChange} />
      ) : (
        <FilterDayInput value={value} onChange={onChange} />
      )
    default:
      return (
        <FilterOptionsInput
          {...props}
          multiple={operator === 'is' || operator === 'is-not'}
          value={value}
          onChange={onChange}
        />
      )
  }
}

interface FilterValueProps {
  value: BasicFilterValue
  onChange: (value: BasicFilterValue) => void
}

function FilterDateRangeInput({ value, onChange }: FilterValueProps) {
  const [start, end] = Array.isArray(value) ? value : ['', '']
  const from = toFilterDay(start)
  const to = toFilterDay(end)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='outline' size='sm' className='h-8'>
            {from && to
              ? `${formatIssueDay(from)} - ${formatIssueDay(to)}`
              : 'Selecionar período'}
          </Button>
        }
      />
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='range'
          selected={{ from, to }}
          onSelect={(range) =>
            onChange([
              range?.from ? toIssueDateISO(range.from) : '',
              range?.to ? toIssueDateISO(range.to) : '',
            ])
          }
        />
      </PopoverContent>
    </Popover>
  )
}

function FilterDayInput({ value, onChange }: FilterValueProps) {
  const day = toFilterDay(typeof value === 'string' ? value : '')
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant='outline' size='sm' className='h-8'>
            {day ? formatIssueDay(day) : 'Selecionar data'}
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

interface FilterOptionsInputProps extends FilterValueProps {
  workspaceId: string
  projectSlug: string
  field: FilterField
  multiple: boolean
}

function FilterOptionsInput({
  workspaceId,
  projectSlug,
  field,
  multiple,
  value,
  onChange,
}: FilterOptionsInputProps) {
  const options = useFieldOptions(field, workspaceId, projectSlug)

  return multiple ? (
    <IssueFilterSelect
      multiple
      title='Selecionar'
      options={options}
      value={Array.isArray(value) ? value : []}
      onChange={onChange}
    />
  ) : (
    <IssueFilterSelect
      title='Selecionar'
      options={options}
      value={typeof value === 'string' ? value : undefined}
      onChange={onChange}
    />
  )
}
