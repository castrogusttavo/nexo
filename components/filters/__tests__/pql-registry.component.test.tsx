import { describe, expect, it } from 'vitest'
import { parsePql } from '../pql-parser'
import {
  PQL_FIELDS,
  PQL_FUNCTIONS,
  PQL_KEYWORDS,
  operatorsForPqlField,
} from '../pql-registry'
import type { PqlField, PqlOperator } from '../pql-types'

const FIELDS = Object.keys(PQL_FIELDS) as PqlField[]

/** A minimal right-hand side for each operator, so a query can be parsed. */
function queryFor(field: PqlField, operator: PqlOperator) {
  if (operator === 'IS NULL') return `${field} IS NULL`
  if (operator === 'IN' || operator === 'NOT IN')
    return `${field} ${operator} (a)`
  if (operator === 'BETWEEN') return `${field} BETWEEN (a, b)`
  return `${field} ${operator} a`
}

describe('operatorsForPqlField', () => {
  it('returns the operator list the field declares', () => {
    expect(operatorsForPqlField('title')).toEqual(['=', '!=', '~'])
    expect(operatorsForPqlField('priority')).toEqual([
      '=',
      '!=',
      'IN',
      'NOT IN',
      '>',
      '>=',
      '<',
      '<=',
    ])
  })

  it('covers every field the parser accepts', () => {
    for (const field of FIELDS) {
      expect(operatorsForPqlField(field).length).toBeGreaterThan(0)
    }
  })

  it('only lists operators the parser really accepts for that field', () => {
    for (const field of FIELDS) {
      for (const operator of operatorsForPqlField(field)) {
        expect(() => parsePql(queryFor(field, operator))).not.toThrow()
      }
    }
  })

  it('leaves out the operators the parser rejects for that field', () => {
    // `title` is text: ordering it makes no sense and the parser says so.
    expect(operatorsForPqlField('title')).not.toContain('>')
    expect(() => parsePql('title > a')).toThrow(
      'Operador ">" não é válido para o campo "title"',
    )
  })

  it('offers BETWEEN on every date field and nowhere else', () => {
    const withBetween = FIELDS.filter((field) =>
      operatorsForPqlField(field).includes('BETWEEN'),
    )

    expect(withBetween).toEqual([
      'start-date',
      'due-date',
      'created-at',
      'updated-at',
    ])
  })

  it('offers IS NULL only on the fields an issue may leave unset', () => {
    const nullable = FIELDS.filter((field) =>
      operatorsForPqlField(field).includes('IS NULL'),
    )

    expect(nullable).toEqual([
      'description',
      'assignees',
      'mentions',
      'labels',
      'cycle',
      'module',
      'start-date',
      'due-date',
    ])
  })
})

describe('PQL registry metadata', () => {
  it('gives every field a pt-BR label', () => {
    for (const field of FIELDS) {
      expect(PQL_FIELDS[field].label).not.toBe('')
    }
  })

  it('declares the arity the parser enforces on each function', () => {
    expect(PQL_FUNCTIONS.isOverdue.args).toEqual([])
    expect(PQL_FUNCTIONS.worklogedBetween.args).toEqual(['date', 'date'])

    expect(() => parsePql('isOverdue()')).not.toThrow()
    expect(() => parsePql('isOverdue(x)')).toThrow(
      'isOverdue espera 0 argumento(s), recebeu 1',
    )
    expect(() => parsePql('worklogedBetween(a, b)')).not.toThrow()
    expect(() => parsePql('worklogedBetween(a)')).toThrow(
      'worklogedBetween espera 2 argumento(s), recebeu 1',
    )
  })

  it('keeps the trailing keywords out of the field and function names', () => {
    for (const keyword of PQL_KEYWORDS) {
      expect(keyword in PQL_FIELDS).toBe(false)
      expect(keyword in PQL_FUNCTIONS).toBe(false)
    }
  })

  // Each message names what was wrong: it is shown under the PQL input as
  // the only explanation the user gets for an unfiltered list.
  it.each([
    ['order-by prioridade', 'Campo desconhecido "prioridade"'],
    ['due-date BETWEEN (2026-01-01)', 'BETWEEN espera exatamente 2 valores'],
    [
      'due-date BETWEEN (2026-01-01, 2026-01-02, 2026-01-03)',
      'BETWEEN espera exatamente 2 valores',
    ],
    ['labels NOT EM (a)', 'Esperado "IN" depois de "NOT"'],
    ['assignees IS NADA', 'Esperado "NULL" depois de "IS"'],
  ])('rejects "%s" with "%s"', (query, message) => {
    expect(() => parsePql(query)).toThrow(message)
  })

  it('accepts the well-formed versions of those queries', () => {
    expect(parsePql('order-by priority desc').orderBy).toEqual({
      field: 'priority',
      direction: 'desc',
    })
    expect(parsePql('labels NOT IN (a)').clauses[0]).toMatchObject({
      operator: 'NOT IN',
    })
    expect(parsePql('assignees IS NULL').clauses[0]).toMatchObject({
      operator: 'IS NULL',
      value: null,
    })
  })
})
