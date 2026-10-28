import { operatorsFor } from './field-registry'
import type { BasicOperator, FilterField } from './filter-schema'
import { IssueFilterSelect } from './issue-filter-select'

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

interface IssueFilterOperatorSelectProps {
  field: FilterField
  value: BasicOperator | undefined
  onChange: (operator: BasicOperator) => void
}

export function IssueFilterOperatorSelect({
  field,
  value,
  onChange,
}: IssueFilterOperatorSelectProps) {
  const options = operatorsFor(field).map((operator) => ({
    label: OPERATOR_LABELS[operator],
    value: operator,
  }))

  return (
    <IssueFilterSelect
      title='Operador'
      options={options}
      value={value}
      onChange={(next) => onChange(next as BasicOperator)}
    />
  )
}
