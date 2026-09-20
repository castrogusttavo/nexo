import { REMOVED_USER_NAME } from '@/lib/removed-user'
import { parseIssueDate } from '@/app/_components/issue/issue-dates'
import type { CycleDTO } from '@/types/cycle'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import type { IssueTypeDTO } from '@/types/issue-type'
import type { LabelDTO } from '@/types/label'
import type { ModuleDTO } from '@/types/module'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO, StateGroupDTO } from '@/types/state'
import { FILTER_FIELDS } from './field-registry'
import type {
  BasicFilterClause,
  BasicOperator,
  FilterField,
} from './filter-schema'
import { PqlLexError } from './pql-lexer'
import { PqlSyntaxError, parsePql } from './pql-parser'
import { PQL_FIELDS } from './pql-registry'
import type {
  PqlField,
  PqlFieldClause,
  PqlFunctionClause,
  PqlFunctionName,
  PqlLiteral,
  PqlOrderBy,
  PqlQuery,
} from './pql-types'

export interface IssueFilterState {
  mode: 'basic' | 'pql'
  filters: BasicFilterClause[]
  pql: string
}

/** Project lookups the filters resolve names, groups and "me" against. */
export interface IssueFilterContext {
  states?: StateDTO[]
  types?: IssueTypeDTO[]
  labels?: LabelDTO[]
  cycles?: CycleDTO[]
  modules?: ModuleDTO[]
  members?: ProjectMemberDTO[]
  currentUserId?: string | null
  projectIdentifier?: string
  /** Reference instant for `isOverdue()` and `today`; defaults to now. */
  now?: Date
}

export interface IssueFilterResult {
  issues: IssueDTO[]
  /** Labels of clauses that need server data and were skipped. */
  unsupported: string[]
  /** PQL parse error, in which case nothing is filtered. */
  error: string | null
  /** True when a PQL `order-by` decided the order of `issues`. */
  ordered: boolean
  active: boolean
}

// These need data the issue list does not carry (mentions, comments,
// links, attachments, worklogs, relations, view history).
const UNSUPPORTED_BASIC_FIELDS: ReadonlySet<FilterField> = new Set(['mentions'])
const UNSUPPORTED_PQL_FIELDS: ReadonlySet<PqlField> = new Set(['mentions'])
const UNSUPPORTED_PQL_FUNCTIONS: ReadonlySet<PqlFunctionName> = new Set([
  'hasRelations',
  'hasLinks',
  'hasAttachment',
  'hasComments',
  'hasWorklogs',
  'recentlyView',
  'attachmentBy',
  'lastCommentBy',
  'worklogedBy',
  'commentsContains',
  'linkContain',
  'linkedto',
  'blockedBy',
  'blocks',
  'duplicateof',
  'afterComments',
  'beforeComments',
  'worklogedBetween',
])

const PRIORITY_RANK: Record<IssuePriorityDTO, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
}

const STATE_GROUP_RANK: Record<StateGroupDTO, number> = {
  BACKLOG: 0,
  UNSTARTED: 1,
  STARTED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
}

const CLOSED_GROUPS: ReadonlySet<StateGroupDTO> = new Set([
  'COMPLETED',
  'CANCELLED',
])

type DayKey = number

/** A local calendar day as a sortable yyyymmdd number. */
function dayKeyOf(date: Date): DayKey {
  return (
    date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate()
  )
}

/** Start/due dates and picker values are calendar days stored as UTC midnight. */
function calendarDayKey(iso: string): DayKey | null {
  if (Number.isNaN(Date.parse(iso))) return null
  return dayKeyOf(parseIssueDate(iso))
}

/** Timestamps (created/updated) fall on the viewer's local day. */
function instantDayKey(iso: string): DayKey {
  return dayKeyOf(new Date(iso))
}

function normalize(text: string) {
  return text.trim().toLocaleLowerCase('pt-BR')
}

function descriptionText(nodes: unknown): string {
  if (!Array.isArray(nodes)) return ''
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const { text, children } = node as { text?: unknown; children?: unknown }
    if (typeof text === 'string') parts.push(text)
    if (Array.isArray(children)) children.forEach(walk)
  }
  nodes.forEach(walk)
  return parts.join(' ').trim()
}

/** Shared per-run lookups so every clause reads from the same maps. */
class Lookup {
  readonly statesById: Map<string, StateDTO>
  readonly childrenByParent = new Map<string, string[]>()
  readonly today: DayKey
  private readonly descriptions = new Map<string, string>()

  constructor(
    readonly issues: IssueDTO[],
    readonly ctx: IssueFilterContext,
  ) {
    this.statesById = new Map((ctx.states ?? []).map((s) => [s.id, s]))
    for (const issue of issues) {
      if (!issue.parentId) continue
      const siblings = this.childrenByParent.get(issue.parentId) ?? []
      siblings.push(issue.id)
      this.childrenByParent.set(issue.parentId, siblings)
    }
    this.today = dayKeyOf(ctx.now ?? new Date())
  }

  stateGroup(issue: IssueDTO): StateGroupDTO | null {
    return this.statesById.get(issue.stateId)?.group ?? null
  }

  description(issue: IssueDTO): string {
    let text = this.descriptions.get(issue.id)
    if (text === undefined) {
      text = descriptionText(issue.description)
      this.descriptions.set(issue.id, text)
    }
    return text
  }

  children(issue: IssueDTO): string[] {
    return this.childrenByParent.get(issue.id) ?? []
  }

  /** `null` means the author was deleted — sort and display it as removed. */
  memberName(userId: string | null): string {
    if (userId === null) return REMOVED_USER_NAME
    return this.ctx.members?.find((m) => m.userId === userId)?.name ?? userId
  }

  /** Issue ids an identifier refers to: `NEX-12`, `12` or the raw id. */
  resolveIssues(raw: string): Set<string> {
    const wanted = normalize(raw)
    const prefix = this.ctx.projectIdentifier
      ? `${normalize(this.ctx.projectIdentifier)}-`
      : null
    const matches = new Set<string>()
    for (const issue of this.issues) {
      const number = String(issue.number)
      if (
        issue.id === raw ||
        wanted === number ||
        (prefix && wanted === `${prefix}${number}`)
      )
        matches.add(issue.id)
    }
    return matches
  }

  resolveUsers(raw: string): Set<string> {
    const wanted = normalize(raw)
    if (wanted === 'me')
      return new Set(this.ctx.currentUserId ? [this.ctx.currentUserId] : [])
    const matches = new Set([raw])
    for (const member of this.ctx.members ?? []) {
      if (
        normalize(member.username) === wanted ||
        normalize(member.name) === wanted
      )
        matches.add(member.userId)
    }
    return matches
  }
}

/** Ids of named project entities matching a PQL value by id or name. */
function resolveNamed(
  items: { id: string; name: string }[] | undefined,
  raw: string,
): Set<string> {
  const wanted = normalize(raw)
  const matches = new Set([raw])
  for (const item of items ?? []) {
    if (normalize(item.name) === wanted) matches.add(item.id)
  }
  return matches
}

function isClauseComplete(clause: BasicFilterClause): boolean {
  if (clause.operator === 'is-empty') return true
  const { value } = clause
  if (value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (clause.operator === 'between' || clause.operator === 'not-between')
    return value.length === 2 && value.every((v) => v !== '')
  return value.some((v) => v !== '')
}

function valueList(value: BasicFilterClause['value']): string[] {
  if (value === null) return []
  return typeof value === 'string' ? [value] : value
}

function parseQuery(pql: string): {
  query: PqlQuery | null
  error: string | null
} {
  if (!pql.trim()) return { query: null, error: null }
  try {
    return { query: parsePql(pql), error: null }
  } catch (e) {
    if (e instanceof PqlSyntaxError || e instanceof PqlLexError)
      return { query: null, error: e.message }
    return { query: null, error: 'Erro ao interpretar a consulta.' }
  }
}

function pqlFunctionLabel(name: PqlFunctionName) {
  return `${name}()`
}

function collectUnsupported(
  state: IssueFilterState,
  query: PqlQuery | null,
): string[] {
  const labels = new Set<string>()
  if (state.mode === 'basic') {
    for (const clause of state.filters) {
      if (
        isClauseComplete(clause) &&
        UNSUPPORTED_BASIC_FIELDS.has(clause.field)
      )
        labels.add(FILTER_FIELDS[clause.field].label)
    }
    return [...labels]
  }
  if (!query) return []
  for (const clause of query.clauses) {
    if (
      clause.kind === 'function' &&
      UNSUPPORTED_PQL_FUNCTIONS.has(clause.name)
    )
      labels.add(pqlFunctionLabel(clause.name))
    if (clause.kind === 'field' && UNSUPPORTED_PQL_FIELDS.has(clause.field))
      labels.add(PQL_FIELDS[clause.field].label)
  }
  if (query.orderBy && UNSUPPORTED_PQL_FIELDS.has(query.orderBy.field))
    labels.add(PQL_FIELDS[query.orderBy.field].label)
  return [...labels]
}

/** Whether the filter state narrows or reorders the issues at all. */
export function isIssueFilterActive(state: IssueFilterState): boolean {
  if (state.mode === 'basic') return state.filters.some(isClauseComplete)
  const { query } = parseQuery(state.pql)
  return (
    !!query &&
    (query.clauses.length > 0 || !!query.orderBy || query.limit !== undefined)
  )
}

/** How many filters are in effect: complete basic clauses, or 1 for PQL. */
export function activeIssueFilterCount(state: IssueFilterState): number {
  if (state.mode === 'basic')
    return state.filters.filter(isClauseComplete).length
  return isIssueFilterActive(state) ? 1 : 0
}

/** Whether a PQL query refers to the signed-in user as `me`. */
export function usesCurrentUser(state: IssueFilterState): boolean {
  if (state.mode !== 'pql') return false
  const { query } = parseQuery(state.pql)
  return !!query?.clauses.some(
    (clause) =>
      clause.kind === 'field' &&
      (clause.field === 'assignees' || clause.field === 'created-by') &&
      literalList(clause).some((l) => normalize(literalText(l)) === 'me'),
  )
}

/** Labels of the clauses in `state` that can't be evaluated client-side. */
export function unsupportedIssueFilters(state: IssueFilterState): string[] {
  const query = state.mode === 'pql' ? parseQuery(state.pql).query : null
  return collectUnsupported(state, query)
}

// ---------------------------------------------------------------------------
// Basic mode
// ---------------------------------------------------------------------------

type DatePredicate = (day: DayKey, values: DayKey[]) => boolean

const DATE_OPERATORS: Partial<Record<BasicOperator, DatePredicate>> = {
  is: (day, [v]) => day === v,
  'is-not': (day, [v]) => day !== v,
  before: (day, [v]) => day < v,
  'not-before': (day, [v]) => day >= v,
  'before-or-on': (day, [v]) => day <= v,
  'not-before-or-on': (day, [v]) => day > v,
  after: (day, [v]) => day > v,
  'not-after': (day, [v]) => day <= v,
  'after-or-on': (day, [v]) => day >= v,
  'not-after-or-on': (day, [v]) => day < v,
  between: (day, [a, b]) => day >= Math.min(a, b) && day <= Math.max(a, b),
  'not-between': (day, [a, b]) => day < Math.min(a, b) || day > Math.max(a, b),
}

function basicDayOf(field: FilterField, issue: IssueDTO): DayKey | null {
  switch (field) {
    case 'start-date':
      return issue.startDate ? calendarDayKey(issue.startDate) : null
    case 'due-date':
      return issue.dueDate ? calendarDayKey(issue.dueDate) : null
    case 'created-at':
      return instantDayKey(issue.createdAt)
    case 'updated-at':
      return instantDayKey(issue.updatedAt)
    default:
      return null
  }
}

function basicScalarOf(
  field: FilterField,
  issue: IssueDTO,
  lookup: Lookup,
): string | null {
  switch (field) {
    case 'type':
      return issue.typeId
    case 'state':
      return issue.stateId
    case 'state-group':
      return lookup.stateGroup(issue)
    case 'priority':
      return issue.priority
    case 'cycle':
      return issue.cycleId
    case 'module':
      return issue.moduleId
    case 'created-by':
      return issue.authorId
    default:
      return null
  }
}

function basicListOf(
  field: FilterField,
  issue: IssueDTO,
  lookup: Lookup,
): string[] {
  switch (field) {
    case 'assignees':
      return issue.assigneeIds
    case 'labels':
      return issue.labelIds
    case 'sub-issues':
      return lookup.children(issue)
    default:
      return []
  }
}

function matchesBasic(
  clause: BasicFilterClause,
  issue: IssueDTO,
  lookup: Lookup,
): boolean {
  const { field, operator } = clause
  const type = FILTER_FIELDS[field].type

  if (type === 'text') {
    const text =
      field === 'title' ? issue.title.trim() : lookup.description(issue)
    if (operator === 'is-empty') return text === ''
    const haystack = normalize(text)
    const needle = normalize(valueList(clause.value)[0] ?? '')
    switch (operator) {
      case 'is':
        return haystack === needle
      case 'is-not':
        return haystack !== needle
      case 'contains':
        return haystack.includes(needle)
      case 'not-contains':
        return !haystack.includes(needle)
      default:
        return true
    }
  }

  if (type === 'date') {
    const day = basicDayOf(field, issue)
    if (operator === 'is-empty') return day === null
    // A clause about a date never matches issues that lack that date.
    if (day === null) return false
    const values = valueList(clause.value)
      .map(calendarDayKey)
      .filter((v): v is DayKey => v !== null)
    const predicate = DATE_OPERATORS[operator]
    return predicate ? predicate(day, values) : true
  }

  if (type === 'relation-multi') {
    const list = basicListOf(field, issue, lookup)
    if (operator === 'is-empty') return list.length === 0
    const wanted = new Set(valueList(clause.value))
    const hit = list.some((id) => wanted.has(id))
    return operator === 'is-not' ? !hit : hit
  }

  const scalar = basicScalarOf(field, issue, lookup)
  if (operator === 'is-empty')
    return scalar === null || (field === 'priority' && scalar === 'NONE')
  const hit = scalar !== null && valueList(clause.value).includes(scalar)
  return operator === 'is-not' ? !hit : hit
}

// ---------------------------------------------------------------------------
// PQL mode
// ---------------------------------------------------------------------------

function literalText(literal: PqlLiteral): string {
  return String(literal.value)
}

function literalList(clause: PqlFieldClause): PqlLiteral[] {
  if (clause.value === null) return []
  return Array.isArray(clause.value) ? clause.value : [clause.value]
}

const PQL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function literalDayKey(literal: PqlLiteral, lookup: Lookup): DayKey | null {
  const text = literalText(literal).trim()
  if (text.toLowerCase() === 'today') return lookup.today
  const match = PQL_DATE.exec(text)
  if (!match) return null
  return Number(match[1]) * 10_000 + Number(match[2]) * 100 + Number(match[3])
}

function pqlDayOf(field: PqlField, issue: IssueDTO): DayKey | null {
  switch (field) {
    case 'start-date':
      return issue.startDate ? calendarDayKey(issue.startDate) : null
    case 'due-date':
      return issue.dueDate ? calendarDayKey(issue.dueDate) : null
    case 'created-at':
      return instantDayKey(issue.createdAt)
    case 'updated-at':
      return instantDayKey(issue.updatedAt)
    default:
      return null
  }
}

function matchesPqlDate(
  clause: PqlFieldClause,
  issue: IssueDTO,
  lookup: Lookup,
): boolean {
  const day = pqlDayOf(clause.field, issue)
  if (clause.operator === 'IS NULL') return day === null
  if (day === null) return false
  const values = literalList(clause).map((l) => literalDayKey(l, lookup))
  if (values.some((v) => v === null)) return false
  const [a, b] = values as DayKey[]
  switch (clause.operator) {
    case '=':
      return day === a
    case '!=':
      return day !== a
    case '>':
      return day > a
    case '>=':
      return day >= a
    case '<':
      return day < a
    case '<=':
      return day <= a
    case 'BETWEEN':
      return day >= Math.min(a, b) && day <= Math.max(a, b)
    default:
      return true
  }
}

/** Resolves a PQL literal to the set of raw values the field is compared to. */
function resolveLiteral(
  field: PqlField,
  literal: PqlLiteral,
  lookup: Lookup,
): Set<string> {
  const raw = literalText(literal)
  const { ctx } = lookup
  switch (field) {
    case 'id':
      return lookup.resolveIssues(raw)
    case 'type':
      return resolveNamed(ctx.types, raw)
    case 'state':
      return resolveNamed(ctx.states, raw)
    case 'labels':
      return resolveNamed(ctx.labels, raw)
    case 'cycle':
      return resolveNamed(ctx.cycles, raw)
    case 'module':
      return resolveNamed(ctx.modules, raw)
    case 'assignees':
    case 'created-by':
      return lookup.resolveUsers(raw)
    case 'state-group':
    case 'priority':
      return new Set([raw.toUpperCase()])
    default:
      return new Set([raw])
  }
}

function pqlValuesOf(
  field: PqlField,
  issue: IssueDTO,
  lookup: Lookup,
): string[] {
  switch (field) {
    case 'id':
      return [issue.id]
    case 'type':
      return [issue.typeId]
    case 'state':
      return [issue.stateId]
    case 'state-group': {
      const group = lookup.stateGroup(issue)
      return group ? [group] : []
    }
    case 'priority':
      return [issue.priority]
    case 'assignees':
      return issue.assigneeIds
    case 'labels':
      return issue.labelIds
    case 'cycle':
      return issue.cycleId ? [issue.cycleId] : []
    case 'module':
      return issue.moduleId ? [issue.moduleId] : []
    case 'created-by':
      // A deleted author matches no member id, so `mine` and per-member
      // filters never claim an anonymized issue.
      return issue.authorId ? [issue.authorId] : []
    default:
      return []
  }
}

function matchesPqlField(
  clause: PqlFieldClause,
  issue: IssueDTO,
  lookup: Lookup,
): boolean {
  const { field, operator } = clause

  if (
    field === 'start-date' ||
    field === 'due-date' ||
    field === 'created-at' ||
    field === 'updated-at'
  )
    return matchesPqlDate(clause, issue, lookup)

  if (field === 'title' || field === 'description') {
    const text =
      field === 'title' ? issue.title.trim() : lookup.description(issue)
    if (operator === 'IS NULL') return text === ''
    const haystack = normalize(text)
    const needle = normalize(literalText(literalList(clause)[0]))
    if (operator === '~') return haystack.includes(needle)
    if (operator === '!=') return haystack !== needle
    return haystack === needle
  }

  const values = pqlValuesOf(field, issue, lookup)
  if (operator === 'IS NULL') return values.length === 0

  if (field === 'priority' && ['>', '>=', '<', '<='].includes(operator)) {
    const target = literalText(literalList(clause)[0]).toUpperCase()
    if (!(target in PRIORITY_RANK)) return false
    const diff =
      PRIORITY_RANK[issue.priority] - PRIORITY_RANK[target as IssuePriorityDTO]
    if (operator === '>') return diff > 0
    if (operator === '>=') return diff >= 0
    if (operator === '<') return diff < 0
    return diff <= 0
  }

  const wanted = new Set<string>()
  for (const literal of literalList(clause)) {
    for (const id of resolveLiteral(field, literal, lookup)) wanted.add(id)
  }
  const hit = values.some((v) => wanted.has(v))
  return operator === '!=' || operator === 'NOT IN' ? !hit : hit
}

function matchesPqlFunction(
  clause: PqlFunctionClause,
  issue: IssueDTO,
  lookup: Lookup,
): boolean {
  switch (clause.name) {
    case 'isOverdue': {
      if (!issue.dueDate) return false
      const group = lookup.stateGroup(issue)
      if (group && CLOSED_GROUPS.has(group)) return false
      const due = calendarDayKey(issue.dueDate)
      return due !== null && due < lookup.today
    }
    case 'hasNoAssignee':
      return issue.assigneeIds.length === 0
    case 'hasNoLabel':
      return issue.labelIds.length === 0
    case 'isTopLevel':
      return !issue.parentId
    case 'isSubWorkItem':
      return !!issue.parentId
    case 'hasChildren':
      return lookup.children(issue).length > 0
    case 'hasStartsDueDate':
      return !!issue.startDate && !!issue.dueDate
    case 'childrenof': {
      const parents = lookup.resolveIssues(literalText(clause.args[0]))
      return !!issue.parentId && parents.has(issue.parentId)
    }
    case 'parentof': {
      const children = lookup.resolveIssues(literalText(clause.args[0]))
      return lookup.children(issue).some((id) => children.has(id))
    }
    default:
      return true
  }
}

function compareNullable<T>(
  left: T | null,
  right: T | null,
  direction: 'asc' | 'desc',
  compare: (a: T, b: T) => number,
) {
  if (left === right) return 0
  // Issues without the value always sink to the bottom.
  if (left === null) return 1
  if (right === null) return -1
  const diff = compare(left, right)
  return direction === 'asc' ? diff : -diff
}

const byNumber = (a: number, b: number) => a - b
const byText = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })

function sortKey(
  field: PqlField,
  issue: IssueDTO,
  lookup: Lookup,
): number | string | null {
  const { ctx } = lookup
  const nameOf = (
    items: { id: string; name: string }[] | undefined,
    id: string | null | undefined,
  ) => (id ? (items?.find((item) => item.id === id)?.name ?? id) : null)

  switch (field) {
    case 'id':
      return issue.number
    case 'title':
      return issue.title
    case 'description':
      return lookup.description(issue) || null
    case 'priority':
      return PRIORITY_RANK[issue.priority]
    case 'state':
      return lookup.statesById.get(issue.stateId)?.order ?? null
    case 'state-group': {
      const group = lookup.stateGroup(issue)
      return group ? STATE_GROUP_RANK[group] : null
    }
    case 'type':
      return nameOf(ctx.types, issue.typeId)
    case 'cycle':
      return nameOf(ctx.cycles, issue.cycleId)
    case 'module':
      return nameOf(ctx.modules, issue.moduleId)
    case 'labels':
      return nameOf(ctx.labels, issue.labelIds[0])
    case 'assignees':
      return issue.assigneeIds[0]
        ? lookup.memberName(issue.assigneeIds[0])
        : null
    case 'created-by':
      return lookup.memberName(issue.authorId)
    case 'start-date':
      return issue.startDate ? Date.parse(issue.startDate) : null
    case 'due-date':
      return issue.dueDate ? Date.parse(issue.dueDate) : null
    case 'created-at':
      return Date.parse(issue.createdAt)
    case 'updated-at':
      return Date.parse(issue.updatedAt)
    default:
      return null
  }
}

function orderIssues(
  issues: IssueDTO[],
  orderBy: PqlOrderBy,
  lookup: Lookup,
): IssueDTO[] {
  const keys = new Map(
    issues.map((issue) => [issue.id, sortKey(orderBy.field, issue, lookup)]),
  )
  return [...issues].sort((a, b) => {
    const left = keys.get(a.id) ?? null
    const right = keys.get(b.id) ?? null
    if (typeof left === 'number' || typeof right === 'number')
      return compareNullable(
        left as number | null,
        right as number | null,
        orderBy.direction,
        byNumber,
      )
    return compareNullable(
      left as string | null,
      right as string | null,
      orderBy.direction,
      byText,
    )
  })
}

// ---------------------------------------------------------------------------

/**
 * Narrows (and in PQL mode, orders and limits) a project's issues by the
 * filter state kept in the URL. Clauses that need data the issue list does
 * not carry are skipped and named in `unsupported` rather than guessed at.
 */
export function applyIssueFilters(
  issues: IssueDTO[],
  state: IssueFilterState,
  ctx: IssueFilterContext = {},
): IssueFilterResult {
  const lookup = new Lookup(issues, ctx)

  if (state.mode === 'basic') {
    const clauses = state.filters.filter(
      (clause) =>
        isClauseComplete(clause) && !UNSUPPORTED_BASIC_FIELDS.has(clause.field),
    )
    const unsupported = collectUnsupported(state, null)
    const active = state.filters.some(isClauseComplete)
    return {
      issues:
        clauses.length === 0
          ? issues
          : issues.filter((issue) =>
              clauses.every((clause) => matchesBasic(clause, issue, lookup)),
            ),
      unsupported,
      error: null,
      ordered: false,
      active,
    }
  }

  const { query, error } = parseQuery(state.pql)
  if (!query)
    return { issues, unsupported: [], error, ordered: false, active: false }

  const unsupported = collectUnsupported(state, query)
  const clauses = query.clauses.filter((clause) =>
    clause.kind === 'function'
      ? !UNSUPPORTED_PQL_FUNCTIONS.has(clause.name)
      : !UNSUPPORTED_PQL_FIELDS.has(clause.field),
  )

  let result =
    clauses.length === 0
      ? issues
      : issues.filter((issue) =>
          clauses.every((clause) =>
            clause.kind === 'function'
              ? matchesPqlFunction(clause, issue, lookup)
              : matchesPqlField(clause, issue, lookup),
          ),
        )

  const orderBy =
    query.orderBy && !UNSUPPORTED_PQL_FIELDS.has(query.orderBy.field)
      ? query.orderBy
      : undefined
  if (orderBy) result = orderIssues(result, orderBy, lookup)
  if (query.limit !== undefined) result = result.slice(0, query.limit)

  return {
    issues: result,
    unsupported,
    error: null,
    ordered: !!orderBy,
    active:
      query.clauses.length > 0 || !!query.orderBy || query.limit !== undefined,
  }
}
