import { BasicOperator, FilterField } from "./filter-schema"

export type FilterFieldType = 'text' | 'enum-single' | 'relation-single' | 'relation-multi' | 'date'

interface FilterFieldMeta {
  label: string
  type: FilterFieldType
}

export const FILTER_FIELDS: Record<FilterField, FilterFieldMeta> = {
  title: { label: 'Título', type: 'text' },
  description: { label: 'Descrição', type: 'text' },
  type: { label: 'Tipo', type: 'enum-single' },
  'sub-issues': { label: 'Sub-issues', type: 'relation-multi' },
  state: { label: 'Status', type: 'enum-single' },
  'state-group': { label: 'Grupo de Status', type: 'enum-single' },
  assignees: { label: 'Responsáveis', type: 'relation-multi' },
  priority: { label: 'Prioridade', type: 'enum-single' },
  mentions: { label: 'Menções', type: 'relation-multi' },
  labels: { label: 'Etiquetas', type: 'relation-multi' },
  cycle: { label: 'Ciclo', type: 'relation-single' },
  module: { label: 'Módulo', type: 'relation-single' },
  'start-date': { label: 'Data de Início', type: 'date' },
  'due-date': { label: 'Data de Vencimento', type: 'date' },
  'created-at': { label: 'Criado em', type: 'date' },
  'updated-at': { label: 'Atualizado em', type: 'date' },
  'created-by': { label: 'Criado por', type: 'relation-single' },
}

const OPERATORS_BY_TYPE: Record<FilterFieldType, BasicOperator[]> = {
  text: ['is', 'is-not', 'contains', 'not-contains', 'is-empty'],
  'enum-single': ['is', 'is-not', 'is-empty'],
  'relation-single': ['is', 'is-not', 'is-empty'],
  'relation-multi': ['is', 'is-not', 'is-empty'],
  date: [
    'is',
    'is-not',
    'before',
    'not-before',
    'before-or-on',
    'not-before-or-on',
    'after',
    'not-after',
    'after-or-on',
    'not-after-or-on',
    'between',
    'not-between',
    'is-empty',
  ],
}

const NEVER_EMPTY: FilterField[] = ['title', 'type', 'state', 'state-group', 'created-by', 'created-at', 'updated-at']

export function operatorsFor(field: FilterField): BasicOperator[] {
  const base = OPERATORS_BY_TYPE[FILTER_FIELDS[field].type]
  return NEVER_EMPTY.includes(field) ? base.filter((op) => op !== 'is-empty') : base
}
