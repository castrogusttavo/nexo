import z from "zod";

export const FilterFieldSchema = z.enum([
  'title',
  'description',
  'type',
  'sub-issues',
  'state',
  'state-group',
  'assignees',
  'priority',
  'mentions',
  'labels',
  'cycle',
  'module',
  'start-date',
  'due-date',
  'created-at',
  'updated-at',
  'created-by'
])

export const BasicOperatorSchema = z.enum([
  'is',
  'is-not',
  'contains',
  'not-contains',
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
  'is-empty'
])

export const BasicFilterValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.tuple([z.string(), z.string()]),
  z.null()
])

export const BasicFilterClauseSchema = z.object({
  id: z.string(),
  field: FilterFieldSchema,
  operator: BasicOperatorSchema,
  value: BasicFilterValueSchema
})

export const BasicFilterClausesSchema = z.array(BasicFilterClauseSchema)

export type FilterField = z.infer<typeof FilterFieldSchema>
export type BasicOperator = z.infer<typeof BasicOperatorSchema>
export type BasicFilterValue = z.infer<typeof BasicFilterValueSchema>
export type BasicFilterClause = z.infer<typeof BasicFilterClauseSchema>
