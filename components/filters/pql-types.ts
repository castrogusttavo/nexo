export type PqlField =
  | 'id'
  | 'title'
  | 'description'
  | 'type'
  | 'state'
  | 'state-group'
  | 'assignees'
  | 'priority'
  | 'mentions'
  | 'labels'
  | 'cycle'
  | 'module'
  | 'start-date'
  | 'due-date'
  | 'created-at'
  | 'updated-at'
  | 'created-by'

export type PqlFunctionName =
  | 'isOverdue'
  | 'hasNoAssignee'
  | 'hasNoLabel'
  | 'isTopLevel'
  | 'isSubWorkItem'
  | 'hasChildren'
  | 'hasStartsDueDate'
  | 'hasRelations'
  | 'hasLinks'
  | 'hasAttachment'
  | 'hasComments'
  | 'hasWorklogs'
  | 'recentlyView'
  | 'attachmentBy'
  | 'lastCommentBy'
  | 'worklogedBy'
  | 'commentsContains'
  | 'linkContain'
  | 'linkedto'
  | 'blockedBy'
  | 'blocks'
  | 'childrenof'
  | 'duplicateof'
  | 'parentof'
  | 'afterComments'
  | 'beforeComments'
  | 'worklogedBetween'

export type PqlOperator =
  | '='
  | '!='
  | '~'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'BETWEEN'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'

export type PqlLiteral =
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; value: string }
  | { kind: 'date'; value: string }
  | { kind: 'number'; value: number }

export interface PqlFieldClause {
  kind: 'field'
  field: PqlField
  operator: PqlOperator
  value: PqlLiteral | PqlLiteral[] | null
}

export interface PqlFunctionClause {
  kind: 'function'
  name: PqlFunctionName
  args: PqlLiteral[]
}

export type PqlClause = PqlFieldClause | PqlFunctionClause

export interface PqlOrderBy {
  field: PqlField
  direction: 'asc' | 'desc'
}

export interface PqlQuery {
  clauses: PqlClause[]
  orderBy?: PqlOrderBy
  limit?: number
}

export type PqlTokenType =
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'STRING'
  | 'NUMBER'
  | 'DATE'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF'

export interface PqlToken {
  type: PqlTokenType
  value: string
  start: number
  end: number
}

export interface PqlParseError {
  message: string
  position: number
}
