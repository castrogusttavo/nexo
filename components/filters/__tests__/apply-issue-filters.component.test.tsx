import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { toIssueDateISO } from '@/app/_components/issue/issue-dates'
import type { CycleDTO } from '@/types/cycle'
import type { IssueDTO } from '@/types/issue'
import type { IssueTypeDTO } from '@/types/issue-type'
import type { LabelDTO } from '@/types/label'
import type { ModuleDTO } from '@/types/module'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import {
  applyIssueFilters,
  type IssueFilterContext,
  type IssueFilterState,
  isIssueFilterActive,
  unsupportedIssueFilters,
} from '../apply-issue-filters'
import type {
  BasicFilterClause,
  BasicFilterValue,
  BasicOperator,
  FilterField,
} from '../filter-schema'

const TIMESTAMPS = {
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
}

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Primeira issue',
    description: [],
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: 'state-todo',
    typeId: 'type-task',
    cycleId: null,
    moduleId: null,
    labelIds: [],
    assigneeIds: [],
    estimateValueId: null,
    authorId: 'user-ana',
    projectId: 'project-1',
    parentId: null,
    ...TIMESTAMPS,
    ...overrides,
  }
}

function buildState(
  id: string,
  name: string,
  group: StateDTO['group'],
  order: number,
): StateDTO {
  return {
    id,
    name,
    description: null,
    group,
    color: 'ZINC',
    order,
    isDefault: false,
    projectId: 'project-1',
    ...TIMESTAMPS,
  }
}

function paragraph(text: string) {
  return { type: 'p', children: [{ text }] }
}

/** A calendar day stored the way the issue date picker saves it. */
function issueDay(year: number, month: number, day: number) {
  return toIssueDateISO(new Date(year, month - 1, day))
}

const STATES: StateDTO[] = [
  buildState('state-backlog', 'Backlog', 'BACKLOG', 0),
  buildState('state-todo', 'A fazer', 'UNSTARTED', 1),
  buildState('state-doing', 'Em andamento', 'STARTED', 2),
  buildState('state-done', 'Concluído', 'COMPLETED', 3),
]

const TYPES = [
  { id: 'type-task', name: 'Tarefa' },
  { id: 'type-bug', name: 'Bug' },
] as IssueTypeDTO[]

const LABELS = [
  { id: 'label-front', name: 'Frontend' },
  { id: 'label-back', name: 'Backend' },
] as LabelDTO[]

const CYCLES = [
  { id: 'cycle-1', name: 'Sprint 1' },
  { id: 'cycle-2', name: 'Sprint 2' },
] as CycleDTO[]

const MODULES = [{ id: 'module-auth', name: 'Autenticação' }] as ModuleDTO[]

const MEMBERS = [
  { userId: 'user-ana', name: 'Ana Souza', username: 'ana' },
  { userId: 'user-bia', name: 'Bia Lima', username: 'bia' },
] as ProjectMemberDTO[]

const CTX: IssueFilterContext = {
  states: STATES,
  types: TYPES,
  labels: LABELS,
  cycles: CYCLES,
  modules: MODULES,
  members: MEMBERS,
  currentUserId: 'user-bia',
  projectIdentifier: 'NEX',
  now: new Date(2026, 8, 19, 10, 0),
}

const ISSUES: IssueDTO[] = [
  buildIssue({
    id: 'i-login',
    number: 1,
    title: 'Tela de login',
    description: [paragraph('Formulário com OAuth do Google')],
    priority: 'HIGH',
    stateId: 'state-doing',
    typeId: 'type-task',
    cycleId: 'cycle-1',
    moduleId: 'module-auth',
    labelIds: ['label-front'],
    assigneeIds: ['user-ana'],
    startDate: issueDay(2026, 9, 10),
    dueDate: issueDay(2026, 9, 18),
    authorId: 'user-ana',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z',
  }),
  buildIssue({
    id: 'i-api',
    number: 2,
    title: 'API de sessão',
    description: [paragraph('Endpoint de refresh')],
    priority: 'URGENT',
    stateId: 'state-todo',
    typeId: 'type-bug',
    cycleId: 'cycle-2',
    labelIds: ['label-back', 'label-front'],
    assigneeIds: ['user-bia'],
    dueDate: issueDay(2026, 9, 20),
    authorId: 'user-bia',
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-06T12:00:00.000Z',
  }),
  buildIssue({
    id: 'i-docs',
    number: 3,
    title: 'Documentar fluxo',
    description: [],
    priority: 'NONE',
    stateId: 'state-done',
    dueDate: issueDay(2026, 9, 1),
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-21T12:00:00.000Z',
  }),
  buildIssue({
    id: 'i-sub',
    number: 4,
    title: 'Botão do Google',
    priority: 'LOW',
    stateId: 'state-backlog',
    parentId: 'i-login',
    assigneeIds: ['user-ana', 'user-bia'],
    startDate: issueDay(2026, 9, 12),
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  }),
]

function ids(issues: IssueDTO[]) {
  return issues.map((issue) => issue.id)
}

function basic(
  field: FilterField,
  operator: BasicOperator,
  value: BasicFilterValue,
): IssueFilterState {
  const clause: BasicFilterClause = { id: 'c1', field, operator, value }
  return { mode: 'basic', filters: [clause], pql: '' }
}

function pql(query: string): IssueFilterState {
  return { mode: 'pql', filters: [], pql: query }
}

function runBasic(
  field: FilterField,
  operator: BasicOperator,
  value: BasicFilterValue,
) {
  return ids(
    applyIssueFilters(ISSUES, basic(field, operator, value), CTX).issues,
  )
}

function runPql(query: string, ctx: IssueFilterContext = CTX) {
  return ids(applyIssueFilters(ISSUES, pql(query), ctx).issues)
}

const ALL = ['i-login', 'i-api', 'i-docs', 'i-sub']

describe('applyIssueFilters without filters', () => {
  it('returns every issue untouched in basic mode with no clauses', () => {
    const result = applyIssueFilters(
      ISSUES,
      { mode: 'basic', filters: [], pql: '' },
      CTX,
    )
    expect(result.issues).toBe(ISSUES)
    expect(result).toMatchObject({
      active: false,
      ordered: false,
      unsupported: [],
      error: null,
    })
  })

  it('ignores the pql expression in basic mode and the clauses in pql mode', () => {
    expect(
      ids(
        applyIssueFilters(
          ISSUES,
          { mode: 'basic', filters: [], pql: 'priority = HIGH' },
          CTX,
        ).issues,
      ),
    ).toEqual(ALL)
    expect(
      ids(
        applyIssueFilters(
          ISSUES,
          {
            mode: 'pql',
            filters: [
              { id: 'c', field: 'priority', operator: 'is', value: ['HIGH'] },
            ],
            pql: '  ',
          },
          CTX,
        ).issues,
      ),
    ).toEqual(ALL)
  })

  it('skips clauses whose value has not been picked yet', () => {
    expect(runBasic('state', 'is', null)).toEqual(ALL)
    expect(runBasic('state', 'is', [])).toEqual(ALL)
    expect(runBasic('title', 'contains', '')).toEqual(ALL)
    expect(runBasic('due-date', 'before', null)).toEqual(ALL)
    expect(runBasic('due-date', 'between', ['', ''])).toEqual(ALL)
  })

  it('reports whether a filter state narrows anything', () => {
    expect(isIssueFilterActive({ mode: 'basic', filters: [], pql: 'x' })).toBe(
      false,
    )
    expect(isIssueFilterActive(basic('state', 'is', null))).toBe(false)
    expect(isIssueFilterActive(basic('state', 'is-empty', null))).toBe(true)
    expect(isIssueFilterActive(basic('state', 'is', ['state-todo']))).toBe(true)
    expect(isIssueFilterActive(pql(''))).toBe(false)
    expect(isIssueFilterActive(pql('isOverdue()'))).toBe(true)
  })
})

describe('applyIssueFilters basic mode', () => {
  describe('text fields', () => {
    it.each([
      ['is', 'tela de LOGIN', ['i-login']],
      ['is-not', 'Tela de login', ['i-api', 'i-docs', 'i-sub']],
      ['contains', 'google', ['i-sub']],
      ['not-contains', 'de', ['i-docs', 'i-sub']],
    ] as const)('title %s %j', (operator, value, expected) => {
      expect(runBasic('title', operator, value)).toEqual(expected)
    })

    it.each([
      ['is', 'endpoint de refresh', ['i-api']],
      ['is-not', 'Endpoint de refresh', ['i-login', 'i-docs', 'i-sub']],
      ['contains', 'oauth', ['i-login']],
      ['not-contains', 'oauth', ['i-api', 'i-docs', 'i-sub']],
      ['is-empty', null, ['i-docs', 'i-sub']],
    ] as const)('description %s %j reads the editor text', (operator, value, expected) => {
      expect(runBasic('description', operator, value)).toEqual(expected)
    })

    it('treats a description of empty paragraphs as empty', () => {
      const issues = [
        buildIssue({ id: 'blank', description: [paragraph('  ')] }),
        buildIssue({
          id: 'nested',
          description: [
            {
              type: 'ul',
              children: [{ type: 'li', children: [{ text: 'x' }] }],
            },
          ],
        }),
      ]
      expect(
        ids(
          applyIssueFilters(issues, basic('description', 'is-empty', null), CTX)
            .issues,
        ),
      ).toEqual(['blank'])
    })
  })

  describe('single-value fields', () => {
    it.each([
      ['state', 'is', ['state-todo', 'state-done'], ['i-api', 'i-docs']],
      ['state', 'is-not', ['state-todo'], ['i-login', 'i-docs', 'i-sub']],
      ['state-group', 'is', ['STARTED', 'BACKLOG'], ['i-login', 'i-sub']],
      ['state-group', 'is-not', ['COMPLETED'], ['i-login', 'i-api', 'i-sub']],
      ['type', 'is', ['type-bug'], ['i-api']],
      ['type', 'is-not', ['type-bug'], ['i-login', 'i-docs', 'i-sub']],
      ['priority', 'is', ['HIGH', 'URGENT'], ['i-login', 'i-api']],
      ['priority', 'is-not', ['NONE'], ['i-login', 'i-api', 'i-sub']],
      ['priority', 'is-empty', null, ['i-docs']],
      ['cycle', 'is', ['cycle-1'], ['i-login']],
      ['cycle', 'is-not', ['cycle-1'], ['i-api', 'i-docs', 'i-sub']],
      ['cycle', 'is-empty', null, ['i-docs', 'i-sub']],
      ['module', 'is', 'module-auth', ['i-login']],
      ['module', 'is-not', ['module-auth'], ['i-api', 'i-docs', 'i-sub']],
      ['module', 'is-empty', null, ['i-api', 'i-docs', 'i-sub']],
      ['created-by', 'is', ['user-bia'], ['i-api']],
      ['created-by', 'is-not', ['user-bia'], ['i-login', 'i-docs', 'i-sub']],
    ] as const)('%s %s %j', (field, operator, value, expected) => {
      expect(
        runBasic(field, operator, value as unknown as BasicFilterValue),
      ).toEqual(expected)
    })

    it('matches no state group when the states have not loaded', () => {
      const result = applyIssueFilters(
        ISSUES,
        basic('state-group', 'is', ['STARTED']),
        { ...CTX, states: undefined },
      )
      expect(result.issues).toEqual([])
    })
  })

  describe('multi-value fields', () => {
    it.each([
      ['assignees', 'is', ['user-bia'], ['i-api', 'i-sub']],
      ['assignees', 'is-not', ['user-bia'], ['i-login', 'i-docs']],
      ['assignees', 'is-empty', null, ['i-docs']],
      ['labels', 'is', ['label-back'], ['i-api']],
      ['labels', 'is', ['label-back', 'label-front'], ['i-login', 'i-api']],
      ['labels', 'is-not', ['label-front'], ['i-docs', 'i-sub']],
      ['labels', 'is-empty', null, ['i-docs', 'i-sub']],
      ['sub-issues', 'is', ['i-sub'], ['i-login']],
      ['sub-issues', 'is-not', ['i-sub'], ['i-api', 'i-docs', 'i-sub']],
      ['sub-issues', 'is-empty', null, ['i-api', 'i-docs', 'i-sub']],
    ] as const)('%s %s %j', (field, operator, value, expected) => {
      expect(
        runBasic(field, operator, value as unknown as BasicFilterValue),
      ).toEqual(expected)
    })
  })

  describe('calendar-day fields', () => {
    // Filter values are written by the picker as UTC midnight of the day.
    const SEP_18 = issueDay(2026, 9, 18)
    const SEP_20 = issueDay(2026, 9, 20)

    it.each([
      ['is', SEP_18, ['i-login']],
      ['is-not', SEP_18, ['i-api', 'i-docs']],
      ['before', SEP_20, ['i-login', 'i-docs']],
      ['not-before', SEP_20, ['i-api']],
      ['before-or-on', SEP_18, ['i-login', 'i-docs']],
      ['not-before-or-on', SEP_18, ['i-api']],
      ['after', SEP_18, ['i-api']],
      ['not-after', SEP_18, ['i-login', 'i-docs']],
      ['after-or-on', SEP_18, ['i-login', 'i-api']],
      ['not-after-or-on', SEP_18, ['i-docs']],
      ['between', [SEP_18, SEP_20], ['i-login', 'i-api']],
      ['between', [SEP_20, SEP_18], ['i-login', 'i-api']],
      ['not-between', [SEP_18, SEP_20], ['i-docs']],
      ['is-empty', null, ['i-sub']],
    ] as const)('due-date %s %j (undated issues never match a comparison)', (operator, value, expected) => {
      expect(
        runBasic('due-date', operator, value as unknown as BasicFilterValue),
      ).toEqual(expected)
    })

    it('filters start-date the same way', () => {
      expect(
        runBasic('start-date', 'after-or-on', issueDay(2026, 9, 11)),
      ).toEqual(['i-sub'])
      expect(runBasic('start-date', 'is-empty', null)).toEqual([
        'i-api',
        'i-docs',
      ])
    })

    it('compares created-at and updated-at by the viewer calendar day', () => {
      expect(runBasic('created-at', 'is', issueDay(2026, 9, 5))).toEqual([
        'i-api',
      ])
      expect(runBasic('updated-at', 'after', issueDay(2026, 9, 10))).toEqual([
        'i-login',
      ])
      expect(
        runBasic('created-at', 'between', [
          issueDay(2026, 9, 1),
          issueDay(2026, 9, 5),
        ]),
      ).toEqual(['i-login', 'i-api'])
    })

    it('still reads legacy picker values saved as local midnight', () => {
      const legacy = new Date(2026, 8, 18).toISOString()
      expect(runBasic('due-date', 'is', legacy)).toEqual(['i-login'])
    })
  })

  it('combines clauses with AND', () => {
    const state: IssueFilterState = {
      mode: 'basic',
      pql: '',
      filters: [
        { id: 'a', field: 'labels', operator: 'is', value: ['label-front'] },
        { id: 'b', field: 'priority', operator: 'is', value: ['URGENT'] },
      ],
    }
    expect(ids(applyIssueFilters(ISSUES, state, CTX).issues)).toEqual(['i-api'])
  })

  it('ignores mentions and reports it as unsupported', () => {
    const state = basic('mentions', 'is', ['user-ana'])
    const result = applyIssueFilters(ISSUES, state, CTX)
    expect(ids(result.issues)).toEqual(ALL)
    expect(result.unsupported).toEqual(['Menções'])
    expect(unsupportedIssueFilters(state)).toEqual(['Menções'])
  })
})

describe('applyIssueFilters PQL mode', () => {
  describe('fields', () => {
    it.each([
      ['id = NEX-2', ['i-api']],
      ['id = nex-2', ['i-api']],
      ['id = 3', ['i-docs']],
      ['id != NEX-1', ['i-api', 'i-docs', 'i-sub']],
      ['id IN (NEX-1, 4)', ['i-login', 'i-sub']],
      ['id NOT IN (NEX-1, NEX-4)', ['i-api', 'i-docs']],
      ['title = "tela de login"', ['i-login']],
      ['title != "Tela de login"', ['i-api', 'i-docs', 'i-sub']],
      ['title ~ google', ['i-sub']],
      ['description ~ "OAuth"', ['i-login']],
      ['description = "endpoint de refresh"', ['i-api']],
      ['description != "Endpoint de refresh"', ['i-login', 'i-docs', 'i-sub']],
      ['description IS NULL', ['i-docs', 'i-sub']],
    ])('%s', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it.each([
      ['type = Bug', ['i-api']],
      ['type = type-bug', ['i-api']],
      ['type != bug', ['i-login', 'i-docs', 'i-sub']],
      ['type IN (Bug, Tarefa)', ALL],
      ['type NOT IN (Tarefa)', ['i-api']],
      ['state = "Em andamento"', ['i-login']],
      ['state = state-done', ['i-docs']],
      ['state != backlog', ['i-login', 'i-api', 'i-docs']],
      ['state IN (Backlog, "A fazer")', ['i-api', 'i-sub']],
      ['state NOT IN (Backlog, "A fazer")', ['i-login', 'i-docs']],
      ['state = Inexistente', []],
      ['state-group = started', ['i-login']],
      ['state-group != COMPLETED', ['i-login', 'i-api', 'i-sub']],
      ['state-group IN (BACKLOG, UNSTARTED)', ['i-api', 'i-sub']],
      ['state-group NOT IN (BACKLOG, UNSTARTED)', ['i-login', 'i-docs']],
    ])('%s resolves names and ids', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it.each([
      ['assignees IN (ana)', ['i-login', 'i-sub']],
      ['assignees IN ("Bia Lima")', ['i-api', 'i-sub']],
      ['assignees IN (user-ana)', ['i-login', 'i-sub']],
      ['assignees IN (me)', ['i-api', 'i-sub']],
      ['assignees NOT IN (ana)', ['i-api', 'i-docs']],
      ['assignees IS NULL', ['i-docs']],
      ['labels IN (backend)', ['i-api']],
      ['labels NOT IN (Frontend)', ['i-docs', 'i-sub']],
      ['labels IS NULL', ['i-docs', 'i-sub']],
      ['cycle = "Sprint 1"', ['i-login']],
      ['cycle != "Sprint 1"', ['i-api', 'i-docs', 'i-sub']],
      ['cycle IN ("Sprint 1", cycle-2)', ['i-login', 'i-api']],
      ['cycle NOT IN ("Sprint 1")', ['i-api', 'i-docs', 'i-sub']],
      ['cycle IS NULL', ['i-docs', 'i-sub']],
      ['module = "Autenticação"', ['i-login']],
      ['module = autenticação', ['i-login']],
      ['module IS NULL', ['i-api', 'i-docs', 'i-sub']],
      ['created-by = bia', ['i-api']],
      ['created-by = me', ['i-api']],
      ['created-by != ana', ['i-api']],
      ['created-by IN (ana, bia)', ALL],
      ['created-by NOT IN (bia)', ['i-login', 'i-docs', 'i-sub']],
    ])('%s', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it('matches nobody for "me" when the viewer is unknown', () => {
      expect(
        runPql('assignees IN (me)', { ...CTX, currentUserId: null }),
      ).toEqual([])
    })

    it.each([
      ['priority = high', ['i-login']],
      ['priority != NONE', ['i-login', 'i-api', 'i-sub']],
      ['priority IN (LOW, URGENT)', ['i-api', 'i-sub']],
      ['priority NOT IN (LOW, URGENT)', ['i-login', 'i-docs']],
      ['priority > MEDIUM', ['i-login', 'i-api']],
      ['priority >= HIGH', ['i-login', 'i-api']],
      ['priority < MEDIUM', ['i-docs', 'i-sub']],
      ['priority <= LOW', ['i-docs', 'i-sub']],
    ])('%s compares by rank', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it.each([
      ['due-date = 2026-09-18', ['i-login']],
      ['due-date != 2026-09-18', ['i-api', 'i-docs']],
      ['due-date > 2026-09-18', ['i-api']],
      ['due-date >= 2026-09-18', ['i-login', 'i-api']],
      ['due-date < 2026-09-18', ['i-docs']],
      ['due-date <= 2026-09-18', ['i-login', 'i-docs']],
      ['due-date BETWEEN (2026-09-01, 2026-09-18)', ['i-login', 'i-docs']],
      ['due-date = "2026-09-20"', ['i-api']],
      ['due-date IS NULL', ['i-sub']],
      ['start-date >= 2026-09-11', ['i-sub']],
      ['start-date IS NULL', ['i-api', 'i-docs']],
      ['created-at = 2026-09-05', ['i-api']],
      ['created-at < 2026-09-01', ['i-docs']],
      ['updated-at BETWEEN (2026-09-06, 2026-09-10)', ['i-api', 'i-sub']],
      ['due-date < today', ['i-login', 'i-docs']],
    ])('%s', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it('combines clauses with AND', () => {
      expect(runPql('labels IN (Frontend) priority = URGENT')).toEqual([
        'i-api',
      ])
    })
  })

  describe('functions', () => {
    it.each([
      // Due before today and not in a completed/cancelled state.
      ['isOverdue()', ['i-login']],
      ['hasNoAssignee()', ['i-docs']],
      ['hasNoLabel()', ['i-docs', 'i-sub']],
      ['isTopLevel()', ['i-login', 'i-api', 'i-docs']],
      ['isSubWorkItem()', ['i-sub']],
      ['hasChildren()', ['i-login']],
      ['hasStartsDueDate()', ['i-login']],
      ['childrenof(NEX-1)', ['i-sub']],
      ['childrenof(i-login)', ['i-sub']],
      ['parentof(NEX-4)', ['i-login']],
      ['parentof(NEX-2)', []],
    ])('%s', (query, expected) => {
      expect(runPql(query)).toEqual(expected)
    })

    it('treats an overdue issue as not overdue once its state is done', () => {
      expect(
        runPql('isOverdue()', { ...CTX, now: new Date(2026, 8, 25) }),
      ).toEqual(['i-login', 'i-api'])
    })

    it.each([
      ['hasRelations()', 'hasRelations()'],
      ['hasLinks()', 'hasLinks()'],
      ['hasAttachment()', 'hasAttachment()'],
      ['hasComments()', 'hasComments()'],
      ['hasWorklogs()', 'hasWorklogs()'],
      ['recentlyView()', 'recentlyView()'],
      ['attachmentBy(ana)', 'attachmentBy()'],
      ['lastCommentBy(ana)', 'lastCommentBy()'],
      ['worklogedBy(ana)', 'worklogedBy()'],
      ['commentsContains("x")', 'commentsContains()'],
      ['linkContain("x")', 'linkContain()'],
      ['linkedto(NEX-1)', 'linkedto()'],
      ['blockedBy(NEX-1)', 'blockedBy()'],
      ['blocks(NEX-1)', 'blocks()'],
      ['duplicateof(NEX-1)', 'duplicateof()'],
      ['afterComments(2026-01-01)', 'afterComments()'],
      ['beforeComments(2026-01-01)', 'beforeComments()'],
      ['worklogedBetween(2026-01-01, 2026-02-01)', 'worklogedBetween()'],
      ['mentions IN (ana)', 'Menções'],
    ])('%s is skipped and reported unsupported', (query, label) => {
      const result = applyIssueFilters(ISSUES, pql(query), CTX)
      expect(ids(result.issues)).toEqual(ALL)
      expect(result.unsupported).toEqual([label])
      expect(unsupportedIssueFilters(pql(query))).toEqual([label])
    })

    it('still applies the supported clauses next to an unsupported one', () => {
      const result = applyIssueFilters(
        ISSUES,
        pql('hasComments() priority = URGENT hasLinks() hasComments()'),
        CTX,
      )
      expect(ids(result.issues)).toEqual(['i-api'])
      expect(result.unsupported).toEqual(['hasComments()', 'hasLinks()'])
    })
  })

  describe('order-by and limit', () => {
    it.each([
      ['order-by priority', ['i-docs', 'i-sub', 'i-login', 'i-api']],
      ['order-by priority desc', ['i-api', 'i-login', 'i-sub', 'i-docs']],
      ['order-by title', ['i-api', 'i-sub', 'i-docs', 'i-login']],
      ['order-by id desc', ['i-sub', 'i-docs', 'i-api', 'i-login']],
      ['order-by state', ['i-sub', 'i-api', 'i-login', 'i-docs']],
      ['order-by state-group desc', ['i-docs', 'i-login', 'i-api', 'i-sub']],
      ['order-by created-at', ['i-docs', 'i-login', 'i-api', 'i-sub']],
      ['order-by updated-at desc', ['i-login', 'i-sub', 'i-api', 'i-docs']],
      // Issues without the date sink to the end in both directions.
      ['order-by due-date', ['i-docs', 'i-login', 'i-api', 'i-sub']],
      ['order-by due-date desc', ['i-api', 'i-login', 'i-docs', 'i-sub']],
      ['order-by start-date desc', ['i-sub', 'i-login', 'i-api', 'i-docs']],
      ['order-by created-by', ['i-login', 'i-docs', 'i-sub', 'i-api']],
      ['order-by cycle desc', ['i-api', 'i-login', 'i-docs', 'i-sub']],
    ])('%s', (query, expected) => {
      const result = applyIssueFilters(ISSUES, pql(query), CTX)
      expect(ids(result.issues)).toEqual(expected)
      expect(result.ordered).toBe(true)
    })

    it('applies the limit after filtering and ordering', () => {
      expect(runPql('isTopLevel() order-by priority desc limit 2')).toEqual([
        'i-api',
        'i-login',
      ])
      expect(runPql('limit 1')).toEqual(['i-login'])
    })

    it('does not mark the result ordered without order-by', () => {
      expect(applyIssueFilters(ISSUES, pql('limit 2'), CTX).ordered).toBe(false)
    })

    it('reports ordering by mentions as unsupported and keeps the order', () => {
      const result = applyIssueFilters(ISSUES, pql('order-by mentions'), CTX)
      expect(ids(result.issues)).toEqual(ALL)
      expect(result.ordered).toBe(false)
      expect(result.unsupported).toEqual(['Menções'])
    })
  })

  it('leaves the list unfiltered and returns the error for an invalid query', () => {
    const result = applyIssueFilters(ISSUES, pql('priority = '), CTX)
    expect(ids(result.issues)).toEqual(ALL)
    expect(result.error).toEqual(expect.any(String))
    expect(result.active).toBe(false)

    const lexError = applyIssueFilters(ISSUES, pql('title = "open'), CTX)
    expect(lexError.error).toBe('String não fechada')
  })
})

describe('applyIssueFilters dates across timezones', () => {
  // Node re-reads TZ when it changes; both sides of UTC are exercised
  // whatever timezone the suite itself runs in.
  const originalTz = process.env.TZ
  afterAll(() => {
    process.env.TZ = originalTz
  })

  for (const tz of ['America/Sao_Paulo', 'Asia/Tokyo', 'UTC']) {
    describe(tz, () => {
      beforeAll(() => {
        process.env.TZ = tz
      })

      const dueOn20 = buildIssue({
        id: 'due-20',
        dueDate: '2026-09-20T00:00:00.000Z',
      })
      const dueOn19 = buildIssue({
        id: 'due-19',
        dueDate: '2026-09-19T00:00:00.000Z',
      })

      it('a "due before Sept 20" basic filter keeps only the 19th', () => {
        const value = toIssueDateISO(new Date(2026, 8, 20))
        expect(
          ids(
            applyIssueFilters(
              [dueOn19, dueOn20],
              basic('due-date', 'before', value),
              CTX,
            ).issues,
          ),
        ).toEqual(['due-19'])
      })

      it('a "due is Sept 20" basic filter matches the stored day', () => {
        const value = toIssueDateISO(new Date(2026, 8, 20))
        expect(
          ids(
            applyIssueFilters(
              [dueOn19, dueOn20],
              basic('due-date', 'is', value),
              CTX,
            ).issues,
          ),
        ).toEqual(['due-20'])
      })

      it('a PQL date literal names the same calendar day', () => {
        expect(
          ids(
            applyIssueFilters(
              [dueOn19, dueOn20],
              pql('due-date = 2026-09-20'),
              CTX,
            ).issues,
          ),
        ).toEqual(['due-20'])
      })

      it('isOverdue compares against the local today', () => {
        expect(
          ids(
            applyIssueFilters([dueOn19, dueOn20], pql('isOverdue()'), {
              ...CTX,
              now: new Date(2026, 8, 20, 0, 30),
            }).issues,
          ),
        ).toEqual(['due-19'])
      })
    })
  }
})

// Deleting a user nulls `authorId` and keeps the issue. "Criado por" must
// never hand an anonymized issue to a real person, and ordering by it has to
// have something to sort the issue under.
describe('applyIssueFilters with an author that was removed', () => {
  const ORPHAN = buildIssue({
    id: 'i-orphan',
    number: 9,
    title: 'Sem autor',
    authorId: null,
  })
  const MINE = buildIssue({ id: 'i-mine', number: 10, authorId: 'user-bia' })
  const POOL = [MINE, ORPHAN]

  function run(state: IssueFilterState) {
    return ids(applyIssueFilters(POOL, state, CTX).issues)
  }

  it('never matches an author filter in basic mode', () => {
    expect(run(basic('created-by', 'is', ['user-bia']))).toEqual(['i-mine'])
  })

  it('is kept by "is-not", since nobody authored it', () => {
    expect(run(basic('created-by', 'is-not', ['user-bia']))).toEqual([
      'i-orphan',
    ])
  })

  it('never matches "me" in PQL', () => {
    expect(ids(applyIssueFilters(POOL, pql('created-by = me'), CTX).issues))
      .toEqual(['i-mine'])
  })

  it('is kept by a PQL negation', () => {
    expect(
      ids(applyIssueFilters(POOL, pql('created-by != bia'), CTX).issues),
    ).toEqual(['i-orphan'])
  })

  it('sorts under the removed-user name rather than a raw null', () => {
    // "Bia Lima" < "Usuário removido", so the orphan sorts last.
    expect(
      ids(applyIssueFilters(POOL, pql('order-by created-by'), CTX).issues),
    ).toEqual(['i-mine', 'i-orphan'])
  })
})
