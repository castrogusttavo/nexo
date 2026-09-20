import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { PqlLexError, tokenize } from '../pql-lexer'
import { PqlSyntaxError, parsePql } from '../pql-parser'
import { PQL_FIELDS, PQL_FUNCTIONS } from '../pql-registry'
import type {
  PqlClause,
  PqlField,
  PqlFunctionName,
  PqlLiteral,
  PqlOperator,
  PqlToken,
} from '../pql-types'

const RUNS = { numRuns: 100 }

const FIELDS = Object.keys(PQL_FIELDS) as PqlField[]
const FUNCTIONS = Object.keys(PQL_FUNCTIONS) as PqlFunctionName[]

// pt-BR names reach the lexer unquoted, so the identifier alphabet has to
// carry accents and cedilla as ordinary letters.
const LETTERS = 'abcdeghinorstuàáâãçéêíóôõúABCDEGHINORSTUÁÂÃÇÉÊÍÓÔÕÚ'
const TAIL = `${LETTERS}0123456789-`

/** A bare name the way a user types a state or label: `Concluído`, `in-review`. */
const identifier = () =>
  fc
    .tuple(
      fc.constantFrom(...LETTERS),
      fc.array(fc.constantFrom(...TAIL), { maxLength: 14 }),
    )
    .map(([head, tail]) => head + tail.join(''))

/** Anything a user may put between quotes — spaces, accents, punctuation. */
const quotedText = () =>
  fc
    .oneof(
      fc.string({ maxLength: 30 }),
      fc.string({ unit: 'grapheme', maxLength: 20 }),
    )
    .filter((text) => !text.includes('"'))

const dateText = () =>
  fc
    .tuple(
      fc.integer({ min: 2000, max: 2060 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    )
    .map(
      ([year, month, day]) =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    )

const whitespace = () =>
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 3 })
    .map((parts) => parts.join(''))

/** Query-shaped noise: real keywords and punctuation in arbitrary order. */
const QUERY_FRAGMENTS = [
  ...FIELDS,
  ...FUNCTIONS,
  'order-by',
  'limit',
  'asc',
  'desc',
  'IN',
  'NOT',
  'IS',
  'NULL',
  'BETWEEN',
  '=',
  '!=',
  '~',
  '>',
  '>=',
  '<',
  '<=',
  '(',
  ')',
  ',',
  '"um valor"',
  '2026-01-02',
  '42',
  'me',
  'today',
]

const noisyQuery = () =>
  fc
    .array(fc.constantFrom(...QUERY_FRAGMENTS), { maxLength: 10 })
    .map((parts) => parts.join(' '))

const anyInput = () =>
  fc.oneof(
    noisyQuery(),
    fc.string({ maxLength: 40 }),
    fc.string({ unit: 'binary', maxLength: 40 }),
    fc.string({ unit: 'grapheme', maxLength: 30 }),
  )

/** A literal plus the source text that produces it. */
const literalSource = (): fc.Arbitrary<{
  text: string
  literal: PqlLiteral
}> =>
  fc.oneof(
    identifier().map((value) => ({
      text: value,
      literal: { kind: 'identifier', value } as PqlLiteral,
    })),
    quotedText().map((value) => ({
      text: `"${value}"`,
      literal: { kind: 'string', value } as PqlLiteral,
    })),
    dateText().map((value) => ({
      text: value,
      literal: { kind: 'date', value } as PqlLiteral,
    })),
    fc.nat({ max: 5000 }).map((value) => ({
      text: String(value),
      literal: { kind: 'number', value } as PqlLiteral,
    })),
  )

const dateLiteralSource = () =>
  dateText().map((value) => ({
    text: value,
    literal: { kind: 'date', value } as PqlLiteral,
  }))

/** A syntactically valid clause, as its token pieces and its expected AST. */
const clauseSource = (): fc.Arbitrary<{
  tokens: string[]
  clause: PqlClause
}> =>
  fc.oneof(
    fc
      .constantFrom(...FIELDS)
      .chain((field) =>
        fc
          .constantFrom(...(PQL_FIELDS[field].operators as PqlOperator[]))
          .map((operator) => ({ field, operator })),
      )
      .chain(({ field, operator }) => {
        const isDateField =
          field === 'start-date' ||
          field === 'due-date' ||
          field === 'created-at' ||
          field === 'updated-at'
        const value = isDateField ? dateLiteralSource() : literalSource()

        if (operator === 'IS NULL')
          return fc.constant<{ tokens: string[]; clause: PqlClause }>({
            tokens: [field, 'IS', 'NULL'],
            clause: { kind: 'field', field, operator, value: null },
          })

        if (operator === 'IN' || operator === 'NOT IN')
          return fc
            .array(value, { minLength: 1, maxLength: 3 })
            .map((values) => ({
              tokens: [
                field,
                ...(operator === 'NOT IN' ? ['NOT', 'IN'] : ['IN']),
                '(',
                ...values.flatMap((v, index) =>
                  index === 0 ? [v.text] : [',', v.text],
                ),
                ')',
              ],
              clause: {
                kind: 'field',
                field,
                operator,
                value: values.map((v) => v.literal),
              } as PqlClause,
            }))

        if (operator === 'BETWEEN')
          return fc.tuple(value, value).map(([from, to]) => ({
            tokens: [field, 'BETWEEN', '(', from.text, ',', to.text, ')'],
            clause: {
              kind: 'field',
              field,
              operator,
              value: [from.literal, to.literal],
            } as PqlClause,
          }))

        return value.map((v) => ({
          tokens: [field, operator, v.text],
          clause: {
            kind: 'field',
            field,
            operator,
            value: v.literal,
          } as PqlClause,
        }))
      }),
    fc.constantFrom(...FUNCTIONS).chain((name) =>
      fc
        .array(literalSource(), {
          minLength: PQL_FUNCTIONS[name].args.length,
          maxLength: PQL_FUNCTIONS[name].args.length,
        })
        .map((args) => ({
          tokens: [
            name,
            '(',
            ...args.flatMap((a, index) => (index === 0 ? [a.text] : [',', a.text])),
            ')',
          ],
          clause: {
            kind: 'function',
            name,
            args: args.map((a) => a.literal),
          } as PqlClause,
        })),
    ),
  )

/** A whole valid query: clauses, an optional order-by and an optional limit. */
const querySource = () =>
  fc
    .tuple(
      fc.array(clauseSource(), { maxLength: 3 }),
      fc.option(
        fc.tuple(
          fc.constantFrom(...FIELDS),
          fc.constantFrom<'asc' | 'desc' | null>('asc', 'desc', null),
        ),
        { nil: null },
      ),
      fc.option(fc.nat({ max: 500 }), { nil: null }),
    )
    .map(([clauses, orderBy, limit]) => {
      const tokens = clauses.flatMap((c) => c.tokens)
      if (orderBy)
        tokens.push('order-by', orderBy[0], ...(orderBy[1] ? [orderBy[1]] : []))
      if (limit !== null) tokens.push('limit', String(limit))
      return {
        tokens,
        expected: {
          clauses: clauses.map((c) => c.clause),
          orderBy: orderBy
            ? { field: orderBy[0], direction: orderBy[1] ?? 'asc' }
            : undefined,
          limit: limit ?? undefined,
        },
      }
    })

function spans(tokens: PqlToken[]) {
  return tokens.filter((token) => token.type !== 'EOF')
}

describe('tokenize() (properties)', () => {
  it('any input either lexes or fails with a PqlLexError', () => {
    fc.assert(
      fc.property(anyInput(), (input) => {
        try {
          const tokens = tokenize(input)
          expect(tokens.at(-1)?.type).toBe('EOF')
        } catch (error) {
          expect(error).toBeInstanceOf(PqlLexError)
          expect((error as PqlLexError).position).toBeGreaterThanOrEqual(0)
          expect((error as PqlLexError).position).toBeLessThan(input.length)
        }
      }),
      RUNS,
    )
  })

  it('the stream always ends with exactly one EOF at the end of the input', () => {
    fc.assert(
      fc.property(querySource(), whitespace(), ({ tokens }, gap) => {
        const input = tokens.join(gap)
        const lexed = tokenize(input)

        expect(lexed.filter((token) => token.type === 'EOF')).toHaveLength(1)
        expect(lexed.at(-1)).toMatchObject({
          type: 'EOF',
          start: input.length,
          end: input.length,
        })
      }),
      RUNS,
    )
  })

  it('every token spans a slice of the input, left to right without overlap', () => {
    fc.assert(
      fc.property(querySource(), whitespace(), ({ tokens }, gap) => {
        const input = tokens.join(gap)
        const lexed = spans(tokenize(input))

        let previousEnd = 0
        for (const token of lexed) {
          expect(token.start).toBeGreaterThanOrEqual(previousEnd)
          expect(token.end).toBeGreaterThan(token.start)
          const slice = input.slice(token.start, token.end)
          // Quotes belong to the span but not to the value.
          expect(slice).toBe(
            token.type === 'STRING' ? `"${token.value}"` : token.value,
          )
          previousEnd = token.end
        }
      }),
      RUNS,
    )
  })

  it('a quoted value survives lexing unchanged', () => {
    fc.assert(
      fc.property(quotedText(), (text) => {
        const tokens = tokenize(`"${text}"`)

        expect(tokens).toHaveLength(2)
        expect(tokens[0]).toMatchObject({
          type: 'STRING',
          value: text,
          start: 0,
          end: text.length + 2,
        })
        expect(tokens[1].type).toBe('EOF')
      }),
      RUNS,
    )
  })

  it('an accented name lexes as a single identifier token', () => {
    fc.assert(
      fc.property(identifier(), (name) => {
        const tokens = tokenize(name)

        expect(tokens).toHaveLength(2)
        expect(tokens[0]).toMatchObject({
          type: 'IDENTIFIER',
          value: name,
          start: 0,
          end: name.length,
        })
      }),
      RUNS,
    )
  })

  it('an unterminated quote always reports the position the quote opened at', () => {
    fc.assert(
      fc.property(whitespace(), quotedText(), (gap, text) => {
        const input = `${gap}"${text}`

        expect(() => tokenize(input)).toThrowError(PqlLexError)
        try {
          tokenize(input)
        } catch (error) {
          expect((error as PqlLexError).position).toBe(gap.length)
        }
      }),
      RUNS,
    )
  })
})

describe('parsePql() (properties)', () => {
  it('any input either parses or fails with a PQL error pointing inside it', () => {
    fc.assert(
      fc.property(anyInput(), (input) => {
        try {
          const query = parsePql(input)
          expect(Array.isArray(query.clauses)).toBe(true)
        } catch (error) {
          // applyIssueFilters only recovers from these two; anything else
          // would surface as "Erro ao interpretar a consulta".
          expect(
            error instanceof PqlSyntaxError || error instanceof PqlLexError,
          ).toBe(true)
          const { position } = error as PqlSyntaxError
          expect(position).toBeGreaterThanOrEqual(0)
          expect(position).toBeLessThanOrEqual(input.length)
        }
      }),
      RUNS,
    )
  })

  it('a well-formed query parses to exactly the clauses, order-by and limit written', () => {
    fc.assert(
      fc.property(querySource(), ({ tokens, expected }) => {
        expect(parsePql(tokens.join(' '))).toEqual(expected)
      }),
      RUNS,
    )
  })

  it('whitespace between tokens never changes the parsed query', () => {
    fc.assert(
      fc.property(
        querySource(),
        fc.array(whitespace(), { minLength: 1, maxLength: 4 }),
        ({ tokens }, gaps) => {
          const spaced = tokens
            .map((token, index) => (index === 0 ? token : gaps[index % gaps.length] + token))
            .join('')

          expect(parsePql(spaced)).toEqual(parsePql(tokens.join(' ')))
        },
      ),
      RUNS,
    )
  })

  it('a quoted value reaches the parsed clause unchanged', () => {
    fc.assert(
      fc.property(quotedText(), (text) => {
        const query = parsePql(`title ~ "${text}"`)

        expect(query.clauses[0]).toEqual({
          kind: 'field',
          field: 'title',
          operator: '~',
          value: { kind: 'string', value: text },
        })
      }),
      RUNS,
    )
  })

  it('an unknown field or function is always a syntax error, never a silent clause', () => {
    fc.assert(
      fc.property(
        identifier().filter(
          (name) =>
            !(name in PQL_FIELDS) &&
            !(name in PQL_FUNCTIONS) &&
            name !== 'order-by' &&
            name !== 'limit',
        ),
        (name) => {
          expect(() => parsePql(`${name} = valor`)).toThrowError(PqlSyntaxError)
        },
      ),
      RUNS,
    )
  })

  it('an operator a field does not allow is always rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FIELDS).chain((field) =>
          fc
            .constantFrom<PqlOperator>('=', '!=', '~', '>', '>=', '<', '<=')
            .filter((operator) => !PQL_FIELDS[field].operators.includes(operator))
            .map((operator) => ({ field, operator })),
        ),
        ({ field, operator }) => {
          expect(() => parsePql(`${field} ${operator} valor`)).toThrowError(
            PqlSyntaxError,
          )
        },
      ),
      RUNS,
    )
  })
})
