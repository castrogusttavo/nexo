import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { toIssueDateISO } from '@/app/_components/issue/issue-dates'
import type { CycleDTO } from '@/types/cycle'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import type { IssueTypeDTO } from '@/types/issue-type'
import type { LabelDTO } from '@/types/label'
import type { ModuleDTO } from '@/types/module'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import {
  activeIssueFilterCount,
  applyIssueFilters,
  type IssueFilterContext,
  type IssueFilterState,
  isIssueFilterActive,
  unsupportedIssueFilters,
} from '../apply-issue-filters'
import { FILTER_FIELDS, operatorsFor } from '../field-registry'
import type { BasicFilterClause, FilterField } from '../filter-schema'

const RUNS = { numRuns: 100 }

const TIMESTAMPS = {
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-02T12:00:00.000Z',
}

/** Fixed reference instant so `today` and `isOverdue()` never drift. */
const NOW = new Date(2026, 5, 15)

const STATES: StateDTO[] = [
  ['state-backlog', 'Backlog', 'BACKLOG'],
  ['state-todo', 'A Fazer', 'UNSTARTED'],
  ['state-doing', 'Em Progresso', 'STARTED'],
  ['state-done', 'Concluído', 'COMPLETED'],
  ['state-cancelled', 'Cancelado', 'CANCELLED'],
].map(([id, name, group], order) => ({
  id: id as string,
  name: name as string,
  description: null,
  group: group as StateDTO['group'],
  color: 'ZINC',
  order,
  isDefault: order === 0,
  projectId: 'project-1',
  ...TIMESTAMPS,
}))

const TYPES: IssueTypeDTO[] = [
  ['type-task', 'Task'],
  ['type-bug', 'Bug'],
  ['type-epic', 'Épico'],
].map(([id, name], order) => ({
  id,
  name,
  description: null,
  color: 'BLUE',
  icon: 'circle',
  isSystem: order === 0,
  order,
  projectId: 'project-1',
  ...TIMESTAMPS,
}))

const LABELS: LabelDTO[] = [
  ['label-ui', 'Interface'],
  ['label-api', 'API'],
  ['label-urgente', 'Urgente'],
].map(([id, name]) => ({
  id,
  name,
  description: null,
  color: 'RED',
  projectId: 'project-1',
  ...TIMESTAMPS,
}))

const CYCLES: CycleDTO[] = [
  ['cycle-1', 'Sprint 1'],
  ['cycle-2', 'Sprint 2'],
].map(([id, name]) => ({
  id,
  name,
  description: null,
  status: 'IN_PROGRESS',
  startDate: null,
  endDate: null,
  leadId: 'user-ana',
  projectId: 'project-1',
  ...TIMESTAMPS,
}))

const MODULES: ModuleDTO[] = [
  ['module-1', 'Autenticação'],
  ['module-2', 'Faturamento'],
].map(([id, name]) => ({
  id,
  name,
  progress: 0,
  status: 'PLANNED',
  startDate: null,
  endDate: null,
  isFavorited: false,
  leadId: 'user-ana',
  projectId: 'project-1',
  ...TIMESTAMPS,
}))

const MEMBERS: ProjectMemberDTO[] = [
  ['user-ana', 'Ana Souza', 'ana'],
  ['user-bruno', 'Bruno Lima', 'bruno'],
  ['user-caio', 'Caio Réis', 'caio'],
].map(([userId, name, username], index) => ({
  userId,
  name,
  username,
  image: null,
  email: `${username}@nexo.test`,
  isLead: index === 0,
  createdAt: TIMESTAMPS.createdAt,
}))

const CONTEXT: IssueFilterContext = {
  states: STATES,
  types: TYPES,
  labels: LABELS,
  cycles: CYCLES,
  modules: MODULES,
  members: MEMBERS,
  currentUserId: 'user-ana',
  projectIdentifier: 'NEX',
  now: NOW,
}

const PRIORITIES: IssuePriorityDTO[] = [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]

const TITLE_WORDS = [
  'Corrigir',
  'login',
  'Revisar',
  'Relatório',
  'API',
  'de',
  'faturamento',
  'Ajustar',
  'ÍCONE',
  'do',
  'menu',
]

const DESCRIPTION_WORDS = [
  'Precisa de revisão do time.',
  'Bloqueado pelo deploy.',
  'Sem detalhes ainda.',
  '',
]

const paragraph = (text: string) => [{ type: 'p', children: [{ text }] }]

const issueDate = () =>
  fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
    .map(([month, day]) => toIssueDateISO(new Date(2026, month - 1, day)))

const instant = () =>
  fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
    .map(([month, day]) =>
      new Date(Date.UTC(2026, month - 1, day, 9, 30)).toISOString(),
    )

function subsetOf<T>(items: T[]) {
  return fc.uniqueArray(fc.constantFrom(...items), { maxLength: items.length })
}

/** An issue as the list actually holds it: ids drawn from the project. */
const issueDraft = () =>
  fc.record({
    title: fc
      .array(fc.constantFrom(...TITLE_WORDS), { minLength: 1, maxLength: 4 })
      .map((words) => words.join(' ')),
    description: fc.constantFrom(...DESCRIPTION_WORDS).map(paragraph),
    priority: fc.constantFrom(...PRIORITIES),
    stateId: fc.constantFrom(...STATES.map((s) => s.id)),
    typeId: fc.constantFrom(...TYPES.map((t) => t.id)),
    cycleId: fc.option(fc.constantFrom(...CYCLES.map((c) => c.id)), {
      nil: null,
    }),
    moduleId: fc.option(fc.constantFrom(...MODULES.map((m) => m.id)), {
      nil: null,
    }),
    labelIds: subsetOf(LABELS.map((l) => l.id)),
    assigneeIds: subsetOf(MEMBERS.map((m) => m.userId)),
    authorId: fc.constantFrom(...MEMBERS.map((m) => m.userId)),
    startDate: fc.option(issueDate(), { nil: null }),
    dueDate: fc.option(issueDate(), { nil: null }),
    createdAt: instant(),
    updatedAt: instant(),
    parentSeed: fc.option(fc.nat({ max: 20 }), { nil: null }),
  })

const issues = () =>
  fc.array(issueDraft(), { maxLength: 12 }).map((drafts) =>
    drafts.map(({ parentSeed, ...draft }, index): IssueDTO => {
      const parent = parentSeed === null ? null : parentSeed % drafts.length
      return {
        ...draft,
        id: `issue-${index}`,
        number: index + 1,
        estimateValueId: null,
        projectId: 'project-1',
        // A parent other than the issue itself, so the sub-issue lookups
        // see real parent/child pairs.
        parentId: parent === null || parent === index ? null : `issue-${parent}`,
      }
    }),
  )

const VALUES_BY_FIELD: Record<FilterField, () => fc.Arbitrary<string>> = {
  title: () => fc.constantFrom(...TITLE_WORDS),
  description: () => fc.constantFrom('revisão', 'deploy', 'detalhes'),
  type: () => fc.constantFrom(...TYPES.map((t) => t.id)),
  'sub-issues': () => fc.constantFrom('issue-0', 'issue-1', 'issue-2'),
  state: () => fc.constantFrom(...STATES.map((s) => s.id)),
  'state-group': () => fc.constantFrom(...STATES.map((s) => s.group)),
  assignees: () => fc.constantFrom(...MEMBERS.map((m) => m.userId)),
  priority: () => fc.constantFrom(...PRIORITIES),
  mentions: () => fc.constantFrom(...MEMBERS.map((m) => m.userId)),
  labels: () => fc.constantFrom(...LABELS.map((l) => l.id)),
  cycle: () => fc.constantFrom(...CYCLES.map((c) => c.id)),
  module: () => fc.constantFrom(...MODULES.map((m) => m.id)),
  'start-date': issueDate,
  'due-date': issueDate,
  'created-at': issueDate,
  'updated-at': issueDate,
  'created-by': () => fc.constantFrom(...MEMBERS.map((m) => m.userId)),
}

const FILTERABLE_FIELDS = (Object.keys(FILTER_FIELDS) as FilterField[]).filter(
  (field) => field !== 'mentions',
)

const DATE_FIELDS: FilterField[] = [
  'start-date',
  'due-date',
  'created-at',
  'updated-at',
]

function clauseOf(
  field: FilterField,
  operator: BasicFilterClause['operator'],
  value: BasicFilterClause['value'],
  id = 'clause',
): BasicFilterClause {
  return { id, field, operator, value }
}

/** A clause a user could build in the UI: valid operator, filled-in value. */
const completeClause = (
  fields: FilterField[] = FILTERABLE_FIELDS,
): fc.Arbitrary<BasicFilterClause> =>
  fc
    .constantFrom(...fields)
    .chain((field) =>
      fc
        .constantFrom(...operatorsFor(field))
        .map((operator) => ({ field, operator })),
    )
    .chain(({ field, operator }) => {
      const value = VALUES_BY_FIELD[field]()
      if (operator === 'is-empty')
        return fc.constant(clauseOf(field, operator, null))
      if (operator === 'between' || operator === 'not-between')
        return fc
          .tuple(value, value)
          .map(([from, to]) => clauseOf(field, operator, [from, to]))
      if (FILTER_FIELDS[field].type === 'text')
        return value.map((v) => clauseOf(field, operator, v))
      return fc
        .uniqueArray(value, { minLength: 1, maxLength: 3 })
        .map((values) => clauseOf(field, operator, values))
    })
    .chain((clause) =>
      fc.nat({ max: 999 }).map((n) => ({ ...clause, id: `clause-${n}` })),
    )

const basicState = (filters: BasicFilterClause[]): IssueFilterState => ({
  mode: 'basic',
  filters,
  pql: '',
})

const pqlState = (pql: string): IssueFilterState => ({
  mode: 'pql',
  filters: [],
  pql,
})

const idsOf = (list: IssueDTO[]) => list.map((issue) => issue.id)
const sortedIdsOf = (list: IssueDTO[]) => [...idsOf(list)].sort()

const run = (list: IssueDTO[], state: IssueFilterState) =>
  applyIssueFilters(list, state, CONTEXT)

/** PQL clauses built from the project fixture, so they resolve to real ids. */
const pqlClauseText = () =>
  fc.oneof(
    fc
      .constantFrom(...STATES.map((s) => s.name))
      .map((name) => `state = "${name}"`),
    fc.constantFrom(...PRIORITIES).map((p) => `priority = ${p}`),
    fc.constantFrom('>', '>=', '<', '<=').map((op) => `priority ${op} MEDIUM`),
    fc
      .constantFrom(...LABELS.map((l) => l.name))
      .map((name) => `labels IN ("${name}")`),
    fc
      .constantFrom(...MEMBERS.map((m) => m.username))
      .map((username) => `assignees IN (${username})`),
    fc.constant('assignees IS NULL'),
    fc.constant('labels IS NULL'),
    fc.constantFrom(
      'isOverdue()',
      'hasNoAssignee()',
      'hasNoLabel()',
      'isTopLevel()',
      'isSubWorkItem()',
      'hasChildren()',
      'hasStartsDueDate()',
    ),
    fc.constantFrom(...TYPES.map((t) => t.name)).map((name) => `type = "${name}"`),
    fc.constant('due-date < today'),
    fc.constant('start-date IS NULL'),
  )

const pqlClauses = () =>
  fc
    .array(pqlClauseText(), { maxLength: 3 })
    .map((clauses) => clauses.join(' '))

const PQL_ORDER_FIELDS = [
  'id',
  'title',
  'priority',
  'state',
  'state-group',
  'type',
  'cycle',
  'module',
  'labels',
  'assignees',
  'created-by',
  'start-date',
  'due-date',
  'created-at',
  'updated-at',
]

describe('applyIssueFilters() — basic mode (properties)', () => {
  it('an empty filter state returns every issue untouched and inactive', () => {
    fc.assert(
      fc.property(issues(), (list) => {
        const result = run(list, basicState([]))

        expect(result.issues).toEqual(list)
        expect(result.active).toBe(false)
        expect(result.error).toBeNull()
        expect(result.ordered).toBe(false)
        expect(isIssueFilterActive(basicState([]))).toBe(false)
      }),
      RUNS,
    )
  })

  it('a clause with an empty value never removes issues', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom(...FILTERABLE_FIELDS),
        fc.constantFrom<BasicFilterClause['value']>('', '   ', [], [''], null),
        (list, field, value) => {
          const operator = operatorsFor(field).filter(
            (op) => op !== 'is-empty',
          )[0]
          const state = basicState([clauseOf(field, operator, value)])

          expect(run(list, state).issues).toEqual(list)
          expect(activeIssueFilterCount(state)).toBe(0)
        },
      ),
      RUNS,
    )
  })

  it('the result is always a sub-sequence of the input, in input order', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.array(completeClause(), { maxLength: 3 }),
        (list, filters) => {
          const result = run(list, basicState(filters)).issues

          // Every kept issue is the very object from the input, and their
          // positions strictly increase — a sub-sequence, never a reorder.
          let previous = -1
          for (const issue of result) {
            const index = list.indexOf(issue)
            expect(index).toBeGreaterThan(previous)
            previous = index
          }
        },
      ),
      RUNS,
    )
  })

  it('adding a clause never grows the result set', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.array(completeClause(), { maxLength: 3 }),
        completeClause(),
        (list, filters, extra) => {
          const before = run(list, basicState(filters)).issues
          const after = run(list, basicState([...filters, extra])).issues

          expect(after.length).toBeLessThanOrEqual(before.length)
          for (const issue of after) expect(before).toContain(issue)
        },
      ),
      RUNS,
    )
  })

  it('combining clauses is the intersection of applying each one alone', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.array(completeClause(), { minLength: 1, maxLength: 3 }),
        (list, filters) => {
          const combined = idsOf(run(list, basicState(filters)).issues)
          const intersection = filters
            .map((clause) => idsOf(run(list, basicState([clause])).issues))
            .reduce((acc, ids) => acc.filter((id) => ids.includes(id)))

          expect(combined).toEqual(intersection)
        },
      ),
      RUNS,
    )
  })

  it('`is` and `is not` partition the issues for every non-date field', () => {
    fc.assert(
      fc.property(
        issues(),
        completeClause(
          FILTERABLE_FIELDS.filter((field) => !DATE_FIELDS.includes(field)),
        ).filter((clause) => clause.operator === 'is'),
        (list, clause) => {
          const matched = idsOf(run(list, basicState([clause])).issues)
          const rejected = idsOf(
            run(list, basicState([{ ...clause, operator: 'is-not' }])).issues,
          )

          expect(matched.filter((id) => rejected.includes(id))).toEqual([])
          expect([...matched, ...rejected].sort()).toEqual(sortedIdsOf(list))
        },
      ),
      RUNS,
    )
  })

  it('`is` and `is not` partition the issues that carry the date', () => {
    fc.assert(
      fc.property(
        issues(),
        completeClause(DATE_FIELDS).filter(
          (clause) => clause.operator === 'is',
        ),
        (list, clause) => {
          const withDate = idsOf(
            run(
              list,
              basicState([{ ...clause, operator: 'is-empty', value: null }]),
            ).issues,
          )
          const present = idsOf(list).filter((id) => !withDate.includes(id))
          const matched = idsOf(run(list, basicState([clause])).issues)
          const rejected = idsOf(
            run(list, basicState([{ ...clause, operator: 'is-not' }])).issues,
          )

          expect(matched.filter((id) => rejected.includes(id))).toEqual([])
          expect([...matched, ...rejected].sort()).toEqual([...present].sort())
        },
      ),
      RUNS,
    )
  })

  it('`contains` ignores case', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom<FilterField>('title', 'description'),
        fc.constantFrom('API', 'revisão', 'MENU', 'Relatório', 'deploy'),
        (list, field, needle) => {
          const asTyped = idsOf(
            run(list, basicState([clauseOf(field, 'contains', needle)])).issues,
          )

          for (const variant of [
            needle.toLocaleLowerCase('pt-BR'),
            needle.toLocaleUpperCase('pt-BR'),
          ]) {
            expect(
              idsOf(
                run(list, basicState([clauseOf(field, 'contains', variant)]))
                  .issues,
              ),
            ).toEqual(asTyped)
          }
        },
      ),
      RUNS,
    )
  })

  it('`contains` and `does not contain` partition the issues', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom<FilterField>('title', 'description'),
        fc.constantFrom('API', 'revisão', 'menu', 'Corrigir'),
        (list, field, needle) => {
          const matched = idsOf(
            run(list, basicState([clauseOf(field, 'contains', needle)])).issues,
          )
          const rejected = idsOf(
            run(list, basicState([clauseOf(field, 'not-contains', needle)]))
              .issues,
          )

          expect(matched.filter((id) => rejected.includes(id))).toEqual([])
          expect([...matched, ...rejected].sort()).toEqual(sortedIdsOf(list))
        },
      ),
      RUNS,
    )
  })

  it('`between` is the same as its two bounds taken together', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom(...DATE_FIELDS),
        fc.tuple(issueDate(), issueDate()),
        (list, field, [a, b]) => {
          const [from, to] = a <= b ? [a, b] : [b, a]
          const between = idsOf(
            run(list, basicState([clauseOf(field, 'between', [from, to])]))
              .issues,
          )
          const bounded = idsOf(
            run(
              list,
              basicState([
                clauseOf(field, 'after-or-on', [from], 'a'),
                clauseOf(field, 'before-or-on', [to], 'b'),
              ]),
            ).issues,
          )

          expect(between).toEqual(bounded)
        },
      ),
      RUNS,
    )
  })

  it('the count of active filters is the count of complete clauses', () => {
    fc.assert(
      fc.property(
        fc.array(completeClause(), { maxLength: 4 }),
        fc.array(
          fc
            .constantFrom(...FILTERABLE_FIELDS)
            .map((field) => clauseOf(field, 'is', '')),
          { maxLength: 3 },
        ),
        (complete, incomplete) => {
          const state = basicState([...complete, ...incomplete])

          expect(activeIssueFilterCount(state)).toBe(complete.length)
          expect(isIssueFilterActive(state)).toBe(complete.length > 0)
        },
      ),
      RUNS,
    )
  })

  it('an unsupported field is reported instead of filtering', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom(...MEMBERS.map((m) => m.userId)),
        (list, userId) => {
          const state = basicState([clauseOf('mentions', 'is', [userId])])
          const result = run(list, state)

          expect(result.issues).toEqual(list)
          expect(result.unsupported).toEqual([FILTER_FIELDS.mentions.label])
          expect(unsupportedIssueFilters(state)).toEqual([
            FILTER_FIELDS.mentions.label,
          ])
          expect(result.active).toBe(true)
        },
      ),
      RUNS,
    )
  })
})

describe('applyIssueFilters() — PQL mode (properties)', () => {
  it('an unparseable query leaves every issue in place and reports the error', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom(
          'state =',
          'unknown-field = 1',
          'priority IN (',
          'title ~',
          '"aberto',
          'order-by',
          'limit',
          'isOverdue(',
          'state = Backlog !',
        ),
        (list, pql) => {
          const result = run(list, pqlState(pql))

          expect(result.issues).toEqual(list)
          expect(result.error).not.toBeNull()
          expect(result.ordered).toBe(false)
          expect(result.active).toBe(false)
        },
      ),
      RUNS,
    )
  })

  it('an empty query returns every issue and is inactive', () => {
    fc.assert(
      fc.property(issues(), fc.constantFrom('', '   ', '\n'), (list, pql) => {
        const result = run(list, pqlState(pql))

        expect(result.issues).toEqual(list)
        expect(result.error).toBeNull()
        expect(result.active).toBe(false)
      }),
      RUNS,
    )
  })

  it('`limit` never returns more than the issues it asks for', () => {
    fc.assert(
      fc.property(
        issues(),
        pqlClauses(),
        fc.nat({ max: 15 }),
        (list, clauses, limit) => {
          const limited = run(list, pqlState(`${clauses} limit ${limit}`)).issues
          const unlimited = run(list, pqlState(clauses)).issues

          expect(limited.length).toBeLessThanOrEqual(limit)
          expect(limited).toEqual(unlimited.slice(0, limit))
        },
      ),
      RUNS,
    )
  })

  it('`order-by` is a permutation of the same filtered set', () => {
    fc.assert(
      fc.property(
        issues(),
        pqlClauses(),
        fc.constantFrom(...PQL_ORDER_FIELDS),
        fc.constantFrom('asc', 'desc'),
        (list, clauses, field, direction) => {
          const filtered = run(list, pqlState(clauses)).issues
          const ordered = run(
            list,
            pqlState(`${clauses} order-by ${field} ${direction}`),
          )

          expect(ordered.ordered).toBe(true)
          expect(sortedIdsOf(ordered.issues)).toEqual(sortedIdsOf(filtered))
        },
      ),
      RUNS,
    )
  })

  it('adding a PQL clause never grows the result set', () => {
    fc.assert(
      fc.property(
        issues(),
        pqlClauses(),
        pqlClauseText(),
        (list, clauses, extra) => {
          const before = run(list, pqlState(clauses)).issues
          const after = run(list, pqlState(`${clauses} ${extra}`)).issues

          expect(after.length).toBeLessThanOrEqual(before.length)
          for (const issue of after) expect(before).toContain(issue)
        },
      ),
      RUNS,
    )
  })

  it('a PQL result is always a sub-sequence of the input while unordered', () => {
    fc.assert(
      fc.property(issues(), pqlClauses(), (list, clauses) => {
        const result = run(list, pqlState(clauses))
        const kept = new Set(idsOf(result.issues))

        expect(result.ordered).toBe(false)
        expect(idsOf(result.issues)).toEqual(
          idsOf(list).filter((id) => kept.has(id)),
        )
      }),
      RUNS,
    )
  })

  it('a state filter selects the same issues by name in PQL as by id in basic mode', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom(...STATES),
        (list, state) => {
          const byId = idsOf(
            run(list, basicState([clauseOf('state', 'is', [state.id])])).issues,
          )
          const byName = idsOf(run(list, pqlState(`state = "${state.name}"`)).issues)

          expect(byName).toEqual(byId)
        },
      ),
      RUNS,
    )
  })

  it('an unsupported PQL function is reported instead of filtering', () => {
    fc.assert(
      fc.property(
        issues(),
        fc.constantFrom('hasLinks()', 'hasComments()', 'hasAttachment()'),
        (list, call) => {
          const result = run(list, pqlState(call))

          expect(result.issues).toEqual(list)
          expect(result.unsupported).toEqual([call])
          expect(result.active).toBe(true)
        },
      ),
      RUNS,
    )
  })
})
