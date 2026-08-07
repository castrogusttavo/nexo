import { operatorsFor } from "./field-registry";
import { BasicOperator, FilterField } from "./filter-schema";
import { FilterSelect } from "./filter-select";

const OPERATOR_LABELS: Record<BasicOperator, string> = {
  is: 'é',
  'is-not': 'não é',
  contains: 'contém',
  'not-contains': 'não contém',
  before: 'antes de',
  'not-before': 'não antes de',
  'before-or-on': 'antes ou em',
  'not-before-or-on': 'não antes ou em',
  after: 'depois de',
  'not-after': 'não depois de',
  'after-or-on': 'depois ou em',
  'not-after-or-on': 'não depois ou em',
  between: 'entre',
  'not-between': 'não entre',
  'is-empty': 'está vazio',
}

interface FilterOperatorSelectProps {
  field: FilterField
  value: BasicOperator | undefined
  onChange: (operator: BasicOperator) => void
}

export function FilterOperatorSelect({ field, value, onChange }: FilterOperatorSelectProps) {
  const options = operatorsFor(field).map((operator) => ({
    label: OPERATOR_LABELS[operator],
    value: operator
  }))

  return (
    <FilterSelect
      title="Operador"
      options={options}
      value={value}
      onChange={(next) => onChange(next as BasicOperator)}
    />
  )
}
