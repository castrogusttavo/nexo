import { PqlField, PqlFunctionName, PqlOperator, PqlOrderBy } from "./pql-types"

interface PqlFieldMeta {
  label: string
  operators: PqlOperator[]
}

export const PQL_FIELDS: Record<PqlField, PqlFieldMeta> = {
  id: { label: 'ID', operators: ['=', '!=', 'IN', 'NOT IN'] },
  title: { label: 'Título', operators: ['=', '!=', '~'] },
  description: { label: 'Descrição', operators: ['=', '!=', '~', 'IS NULL'] },
  type: { label: 'Tipo', operators: ['=', '!=', 'IN', 'NOT IN'] },
  state: { label: 'Status', operators: ['=', '!=', 'IN', 'NOT IN'] },
  'state-group': { label: 'Grupo de Status', operators: ['=', '!=', 'IN', 'NOT IN'] },
  assignees: { label: 'Responsáveis', operators: ['IN', 'NOT IN', 'IS NULL'] },
  priority: { label: 'Prioridade', operators: ['=', '!=', 'IN', 'NOT IN', '>', '>=', '<', '<='] },
  mentions: { label: 'Menções', operators: ['IN', 'NOT IN', 'IS NULL'] },
  labels: { label: 'Etiquetas', operators: ['IN', 'NOT IN', 'IS NULL'] },
  cycle: { label: 'Ciclo', operators: ['=', '!=', 'IN', 'NOT IN', 'IS NULL'] },
  module: { label: 'Módulo', operators: ['=', '!=', 'IN', 'NOT IN', 'IS NULL'] },
  'start-date': { label: 'Data de Início', operators: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IS NULL'] },
  'due-date': { label: 'Data de Vencimento', operators: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN', 'IS NULL'] },
  'created-at': { label: 'Criado em', operators: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'] },
  'updated-at': { label: 'Atualizado em', operators: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'] },
  'created-by': { label: 'Criado por', operators: ['=', '!=', 'IN', 'NOT IN'] },
}

export type PqlArgType = 'user' | 'text' | 'issue' | 'date'

interface PqlFunctionMeta {
  args: PqlArgType[]
}

export const PQL_FUNCTIONS: Record<PqlFunctionName, PqlFunctionMeta> = {
  isOverdue: { args: [] },
  hasNoAssignee: { args: [] },
  hasNoLabel: { args: [] },
  isTopLevel: { args: [] },
  isSubWorkItem: { args: [] },
  hasChildren: { args: [] },
  hasStartsDueDate: { args: [] },
  hasRelations: { args: [] },
  hasLinks: { args: [] },
  hasAttachment: { args: [] },
  hasComments: { args: [] },
  hasWorklogs: { args: [] },
  recentlyView: { args: [] },
  attachmentBy: { args: ['user'] },
  lastCommentBy: { args: ['user'] },
  worklogedBy: { args: ['user'] },
  commentsContains: { args: ['text'] },
  linkContain: { args: ['text'] },
  linkedto: { args: ['issue'] },
  blockedBy: { args: ['issue'] },
  blocks: { args: ['issue'] },
  childrenof: { args: ['issue'] },
  duplicateof: { args: ['issue'] },
  parentof: { args: ['issue'] },
  afterComments: { args: ['date'] },
  beforeComments: { args: ['date'] },
  worklogedBetween: { args: ['date', 'date'] },
}

export const PQL_KEYWORDS = ['order-by', 'limit'] as const
export type PqlKeyword = (typeof PQL_KEYWORDS)[number]

export function operatorsForPqlField(field: PqlField): PqlOperator[] {
  return PQL_FIELDS[field].operators
}
