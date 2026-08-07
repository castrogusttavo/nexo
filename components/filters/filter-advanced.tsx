import { FILTER_FIELDS, operatorsFor } from "./field-registry";
import { FilterAdvancedRow } from "./filter-advanced-row";
import { BasicFilterClause, FilterField } from "./filter-schema";
import { FilterSelect } from "./filter-select";

const FIELD_OPTIONS = Object.entries(FILTER_FIELDS).map(([value, meta]) => ({
  label: meta.label,
  value
}))

interface FilterAdvancedProps {
  workspaceId: string
  projectSlug: string
  clauses: BasicFilterClause[]
  onClausesChange: (clauses: BasicFilterClause[]) => void
}

export function FilterAdvanced({ workspaceId, projectSlug, clauses, onClausesChange }: FilterAdvancedProps) {
  function handleAddField(field: string) {
    const nextField = field as FilterField
    const newClause: BasicFilterClause = {
      id: crypto.randomUUID(),
      field: nextField,
      operator: operatorsFor(nextField)[0],
      value: null
    }
    onClausesChange([...clauses, newClause])
  }

  function handleRowChange(index: number, clause: BasicFilterClause) {
    onClausesChange(clauses.map((c, i) => (i === index ? clause : c)))
  }

  function handleRowRemove(index: number) {
    onClausesChange(clauses.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {clauses.map((clause, index) => (
        <FilterAdvancedRow
          key={clause.id}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          clause={clause}
          onChange={(next) => handleRowChange(index, next)}
          onRemove={() => handleRowRemove(index)}
        />
      ))}
      <FilterSelect title='Adicionar filtro' options={FIELD_OPTIONS} value={undefined} onChange={handleAddField} />
    </div>
  )
}
