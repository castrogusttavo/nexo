import { PqlToken } from "./pql-types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/
const IDENTIFIER_CHAR = /[A-Za-z0-9-]/

export class PqlLexError extends Error {
  position: number
  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

function isDigit(ch: string) {
  return ch >= '0' && ch <= '9'
}

function isLetter(ch: string) {
  return /[A-Za-z]/.test(ch)
}

export function tokenize(input: string): PqlToken[] {
  const tokens: PqlToken[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === '"') {
      const start = i
      i++
      let value = ''
      while (i < input.length && input[i] !== '"') {
        value += input[i]
        i++
      }
      if (i >= input.length) {
        throw new PqlLexError('String não fechada', start)
      }
      i++
      tokens.push({ type: 'STRING', value, start, end: i })
      continue
    }

    if (ch === '=') {
      tokens.push({ type: 'OPERATOR', value: '=', start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === '!') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '!=', start: i, end: i + 2 })
        i += 2
        continue
      }
      throw new PqlLexError('Caractere inesperado "!"', i)
    }

    if (ch === '~') {
      tokens.push({ type: 'OPERATOR', value: '~', start: i, end: i + 1 })
      i++
      continue
    }

    if (ch === '>') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '>=', start: i, end: i + 2 })
        i += 2
      } else {
        tokens.push({ type: 'OPERATOR', value: '>', start: i, end: i + 1 })
        i++
      }
      continue
    }

    if (ch === '<') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '<=', start: i, end: i + 2 })
        i += 2
      } else {
        tokens.push({ type: 'OPERATOR', value: '<', start: i, end: i + 1 })
        i++
      }
      continue
    }

    if (isDigit(ch)) {
      const start = i
      const dateMatch = DATE_PATTERN.exec(input.slice(i))
      if (dateMatch) {
        const value = dateMatch[0]
        i += value.length
        tokens.push({ type: 'DATE', value, start, end: i })
        continue
      }
      let value = ''
      while (i < input.length && (isDigit(input[i]) || input[i] === '.')) {
        value += input[i]
        i++
      }
      tokens.push({ type: 'NUMBER', value, start, end: i })
      continue
    }

    if (isLetter(ch)) {
      const start = i
      let value = ''
      while (i < input.length && IDENTIFIER_CHAR.test(input[i])) {
        value += input[i]
        i++
      }
      tokens.push({ type: 'IDENTIFIER', value, start, end: i })
      continue
    }

    throw new PqlLexError(`Caractere inesperado "${ch}"`, i)
  }

  tokens.push({ type: 'EOF', value: '', start: i, end: i })
  return tokens
}
