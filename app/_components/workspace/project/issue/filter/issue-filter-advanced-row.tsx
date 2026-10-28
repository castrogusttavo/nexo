import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { FILTER_FIELDS, operatorsFor } from './field-registry'
import type { BasicFilterClause, FilterField } from './filter-schema'
import { IssueFilterOperatorSelect } from './issue-filter-operator-select'
import { IssueFilterSelect } from './issue-filter-select'
import { IssueFilterValueInput } from './issue-filter-value-input'

const FIELD_OPTIONS = Object.entries(FILTER_FIELDS).map(([value, meta]) => ({
  label: meta.label,
  value,
}))

interface IssueFilterAdvancedRowProps {
  workspaceId: string
  projectSlug: string
  clause: BasicFilterClause
  onChange: (clause: BasicFilterClause) => void
  onRemove: () => void
}

export function IssueFilterAdvancedRow({
  workspaceId,
  projectSlug,
  clause,
  onChange,
  onRemove,
}: IssueFilterAdvancedRowProps) {
  function handleFieldChange(field: string) {
    const nextField = field as FilterField
    onChange({
      ...clause,
      field: nextField,
      operator: operatorsFor(nextField)[0],
      value: null,
    })
  }

  function handleOperatorChange(operator: BasicFilterClause['operator']) {
    onChange({ ...clause, operator, value: null })
  }

  function handleValueChange(value: BasicFilterClause['value']) {
    onChange({ ...clause, value })
  }

  return (
    <div className='flex items-center gap-2'>
      <IssueFilterSelect
        title='Campo'
        options={FIELD_OPTIONS}
        value={clause.field}
        onChange={handleFieldChange}
      />
      <IssueFilterOperatorSelect
        field={clause.field}
        value={clause.operator}
        onChange={handleOperatorChange}
      />
      <IssueFilterValueInput
        workspaceId={workspaceId}
        projectSlug={projectSlug}
        field={clause.field}
        operator={clause.operator}
        value={clause.value}
        onChange={handleValueChange}
      />
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        aria-label='Remover filtro'
        onClick={onRemove}
      >
        <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
