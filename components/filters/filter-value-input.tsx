'use client'

import { useStates } from "@/src/hooks/use-state"
import { BasicFilterValue, BasicOperator, FilterField } from "./filter-schema"
import { useIssueTypes } from "@/src/hooks/use-issue-type"
import { useLabels } from "@/src/hooks/use-label"
import { useCycles } from "@/src/hooks/use-cycle"
import { useModules } from "@/src/hooks/use-module"
import { useProjectMembers } from "@/src/hooks/use-project-member"
import { useIssues } from "@/src/hooks/use-issue"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"
import { Button } from "../ui/button"
import { FilterSelect } from "./filter-select"
import { FILTER_FIELDS } from "./field-registry"
import { Input } from "../ui/input"

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

interface FilterValueInputProps {
  workspaceId: string
  projectSlug: string
  field: FilterField
  operator: BasicOperator
  value: BasicFilterValue
  onChange: (value: BasicFilterValue) => void
}

function useFiledOptions(field: FilterField, workspaceId: string, projectSlug: string) {
  const states = useStates(workspaceId, projectSlug)
  const types = useIssueTypes(workspaceId, projectSlug)
  const labels = useLabels(workspaceId, projectSlug)
  const cycles = useCycles(workspaceId, projectSlug)
  const modules = useModules(workspaceId, projectSlug)
  const members = useProjectMembers(workspaceId, projectSlug)
  const issues = useIssues(workspaceId, projectSlug)

  switch (field) {
    case 'state':
      return (states.data ?? []).map((s) => ({ label: s.name, value: s.id }))
    case 'type':
      return (types.data ?? []).map((t) => ({ label: t.name, value: t.id }))
    case 'labels':
      return (labels.data ?? []).map((l) => ({ label: l.name, value: l.id }))
    case 'cycle':
      return (cycles.data ?? []).map((c) => ({ label: c.name, value: c.id }))
    case 'module':
      return (modules.data ?? []).map((m) => ({ label: m.name, value: m.id }))
    case 'assignees':
    case 'mentions':
    case 'created-by':
      return (members.data ?? []).map((m) => ({ label: m.name, value: m.userId }))
    case 'sub-issues':
      return (issues.data ?? []).map((i) => ({ label: i.title, value: i.id }))
    case 'priority':
      return PRIORITY_OPTIONS
    case 'state-group':
      return STATE_GROUP_OPTIONS
    default:
      return []
  }
}

export function FilterValueInput({ workspaceId, projectSlug, field, operator, value, onChange }: FilterValueInputProps) {
  const options = useFiledOptions(field, workspaceId, projectSlug)

  if (operator === 'is-empty') return null

  const fieldType = FILTER_FIELDS[field].type

  if (fieldType === 'text') {
    return (
      <Input
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder='Valor'
      className='h-8 w-48'
      />
    )
  }

  if(fieldType === 'date') {
    if (operator === 'between' || operator === 'not-between') {
      const [start, end] = Array.isArray(value) ? value : ['', '']
      return (
        <Popover>
          <PopoverTrigger
            render={
              <Button variant='outline' size='sm' className='h-8'>
                {start && end ? `${new Date(start).toLocaleDateString('pt-BR')} - ${new Date(end).toLocaleDateString('pt-BR')}` : 'Selecionar período'}
              </Button>
          }
          />
          <PopoverContent className='w-auto p-0'>
            <Calendar
              mode='range'
              selected={{ from: start ? new Date(start) : undefined, to: end ? new Date(end) : undefined }}
              onSelect={(range) => onChange([range?.from?.toISOString() ?? '', range?.to?.toISOString() ?? ''])}
            />
          </PopoverContent>
        </Popover>
      )
    }

    const dateValue = typeof value === 'string' ? value : ''
    return (
      <Popover>
        <PopoverTrigger
          render={
            <Button variant='outline' size='sm' className='h-8'>
              {dateValue ? new Date(dateValue).toLocaleDateString('pt-BR') : 'Selecionar data'}
            </Button>
        }
        />
        <PopoverContent className='w-auto p-0'>
          <Calendar
            mode='single'
            selected={dateValue ? new Date(dateValue) : undefined}
            onSelect={(date) => onChange(date ? date.toISOString() : null)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  const isMulti = operator === 'is' || operator === 'is-not'

  if (isMulti) {
    return (
      <FilterSelect
        multiple
        title='Selecionar'
        options={options}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    )
  }

  return (
    <FilterSelect
      title='Selecionar'
      options={options}
      value={typeof value === 'string' ? value : undefined}
      onChange={onChange}
    />
  )
}
