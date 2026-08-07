import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { NexoIcon } from "../icon/icon";
import { Button } from "../ui/button";
import { FILTER_FIELDS, operatorsFor } from "./field-registry";
import { FilterOperatorSelect } from "./filter-operator-select";
import { BasicFilterClause, FilterField } from "./filter-schema";
import { FilterSelect } from "./filter-select";
import { FilterValueInput } from "./filter-value-input";

const FIELD_OPTIONS = Object.entries(FILTER_FIELDS).map(([value, meta]) => ({
  label: meta.label,
  value
}))

interface FilterAdvancedRowProps {
  workspaceId: string
  projectSlug: string
  clause: BasicFilterClause
  onChange: (clause: BasicFilterClause) => void
  onRemove: () => void
}

export function FilterAdvancedRow({ workspaceId, projectSlug, clause, onChange, onRemove }: FilterAdvancedRowProps) {
  function handleFieldChange(field: string) {
    const nextField = field as FilterField
    onChange({ ...clause, field: nextField, operator: operatorsFor(nextField)[0], value: null })
  }

  function handleOperatorChange(operator: BasicFilterClause['operator']) {
    onChange({ ...clause, operator, value: null })
  }

  function handleValueChange(value: BasicFilterClause['value']) {
    onChange({ ...clause, value })
  }

  return (
    <div className="flex items-center gap-2">
      <FilterSelect title='Campo' options={FIELD_OPTIONS} value={clause.field} onChange={handleFieldChange} />
      <FilterOperatorSelect field={clause.field} value={clause.operator} onChange={handleOperatorChange} />
      <FilterValueInput
        workspaceId={workspaceId}
        projectSlug={projectSlug}
        field={clause.field}
        operator={clause.operator}
        value={clause.value}
        onChange={handleValueChange}
      />
      <Button variant='ghost' size='icon' className='h-8 w-8' onClick={onRemove}>
        <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
