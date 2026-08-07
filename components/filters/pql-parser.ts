import type {
  PqlClause,
  PqlField,
  PqlFieldClause,
  PqlFunctionClause,
  PqlFunctionName,
  PqlLiteral,
  PqlOperator,
  PqlOrderBy,
  PqlQuery,
  PqlToken,
} from './pql-types'
import { PQL_FIELDS, PQL_FUNCTIONS } from './pql-registry'
import { tokenize } from './pql-lexer'

export class PqlSyntaxError extends Error {
  position: number
  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

const COMPARISON_OPERATORS: Record<string, PqlOperator> = {
  '=': '=',
  '!=': '!=',
  '~': '~',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
}

function isPqlField(value: string): value is PqlField {
  return value in PQL_FIELDS
}

function isPqlFunction(value: string): value is PqlFunctionName {
  return value in PQL_FUNCTIONS
}

class Parser {
  private tokens: PqlToken[]
  private pos = 0

  constructor(tokens: PqlToken[]) {
    this.tokens = tokens
  }

  private peek(): PqlToken {
    return this.tokens[this.pos]
  }

  private advance(): PqlToken {
    return this.tokens[this.pos++]
  }

  private expectType(type: PqlToken['type']): PqlToken {
    const token = this.peek()
    if (token.type !== type) {
      throw new PqlSyntaxError(`Esperado ${type}, encontrado "${token.value || token.type}"`, token.start)
    }
    return this.advance()
  }

  parseQuery(): PqlQuery {
    const clauses: PqlClause[] = []
    let orderBy: PqlOrderBy | undefined
    let limit: number | undefined

    while (this.peek().type !== 'EOF') {
      const token = this.peek()

      if (token.type === 'IDENTIFIER' && token.value === 'order-by') {
        this.advance()
        orderBy = this.parseOrderBy()
        continue
      }

      if (token.type === 'IDENTIFIER' && token.value === 'limit') {
        this.advance()
        limit = this.parseLimit()
        continue
      }

      clauses.push(this.parseClause())
    }

    return { clauses, orderBy, limit }
  }

  private parseOrderBy(): PqlOrderBy {
    const fieldToken = this.expectType('IDENTIFIER')
    if (!isPqlField(fieldToken.value)) {
      throw new PqlSyntaxError(`Campo desconhecido "${fieldToken.value}"`, fieldToken.start)
    }

    let direction: 'asc' | 'desc' = 'asc'
    const next = this.peek()
    if (next.type === 'IDENTIFIER' && (next.value === 'asc' || next.value === 'desc')) {
      direction = next.value
      this.advance()
    }

    return { field: fieldToken.value, direction }
  }

  private parseLimit(): number {
    const numberToken = this.expectType('NUMBER')
    return Number(numberToken.value)
  }

  private parseClause(): PqlClause {
    const token = this.expectType('IDENTIFIER')

    if (isPqlFunction(token.value)) {
      return this.parseFunctionClause(token.value, token.start)
    }

    if (isPqlField(token.value)) {
      return this.parseFieldClause(token.value, token.start)
    }

    throw new PqlSyntaxError(`Campo ou função desconhecida "${token.value}"`, token.start)
  }

  private parseFunctionClause(name: PqlFunctionName, start: number): PqlFunctionClause {
    this.expectType('LPAREN')
    const meta = PQL_FUNCTIONS[name]
    const args: PqlLiteral[] = []

    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseLiteral())
      while (this.peek().type === 'COMMA') {
        this.advance()
        args.push(this.parseLiteral())
      }
    }

    this.expectType('RPAREN')

    if (args.length !== meta.args.length) {
      throw new PqlSyntaxError(`${name} espera ${meta.args.length} argumento(s), recebeu ${args.length}`, start)
    }

    return { kind: 'function', name, args }
  }

  private parseFieldClause(field: PqlField, start: number): PqlFieldClause {
    const operator = this.parseOperator()
    const allowed = PQL_FIELDS[field].operators
    if (!allowed.includes(operator)) {
      throw new PqlSyntaxError(`Operador "${operator}" não é válido para o campo "${field}"`, start)
    }

    if (operator === 'IS NULL') {
      return { kind: 'field', field, operator, value: null }
    }

    if (operator === 'IN' || operator === 'NOT IN') {
      return { kind: 'field', field, operator, value: this.parseLiteralList() }
    }

    if (operator === 'BETWEEN') {
      const values = this.parseLiteralList()
      if (values.length !== 2) {
        throw new PqlSyntaxError('BETWEEN espera exatamente 2 valores', start)
      }
      return { kind: 'field', field, operator, value: values }
    }

    return { kind: 'field', field, operator, value: this.parseLiteral() }
  }

  private parseOperator(): PqlOperator {
    const token = this.peek()

    if (token.type === 'OPERATOR' && token.value in COMPARISON_OPERATORS) {
      this.advance()
      return COMPARISON_OPERATORS[token.value]
    }

    if (token.type === 'IDENTIFIER' && token.value === 'BETWEEN') {
      this.advance()
      return 'BETWEEN'
    }

    if (token.type === 'IDENTIFIER' && token.value === 'IN') {
      this.advance()
      return 'IN'
    }

    if (token.type === 'IDENTIFIER' && token.value === 'NOT') {
      this.advance()
      const next = this.expectType('IDENTIFIER')
      if (next.value !== 'IN') {
        throw new PqlSyntaxError('Esperado "IN" depois de "NOT"', next.start)
      }
      return 'NOT IN'
    }

    if (token.type === 'IDENTIFIER' && token.value === 'IS') {
      this.advance()
      const next = this.expectType('IDENTIFIER')
      if (next.value !== 'NULL') {
        throw new PqlSyntaxError('Esperado "NULL" depois de "IS"', next.start)
      }
      return 'IS NULL'
    }

    throw new PqlSyntaxError(`Operador esperado, encontrado "${token.value || token.type}"`, token.start)
  }

  private parseLiteralList(): PqlLiteral[] {
    this.expectType('LPAREN')
    const values: PqlLiteral[] = [this.parseLiteral()]
    while (this.peek().type === 'COMMA') {
      this.advance()
      values.push(this.parseLiteral())
    }
    this.expectType('RPAREN')
    return values
  }

  private parseLiteral(): PqlLiteral {
    const token = this.advance()

    switch (token.type) {
      case 'STRING':
        return { kind: 'string', value: token.value }
      case 'DATE':
        return { kind: 'date', value: token.value }
      case 'NUMBER':
        return { kind: 'number', value: Number(token.value) }
      case 'IDENTIFIER':
        return { kind: 'identifier', value: token.value }
      default:
        throw new PqlSyntaxError(`Valor esperado, encontrado "${token.value || token.type}"`, token.start)
    }
  }
}

export function parsePql(input: string): PqlQuery {
  const tokens = tokenize(input)
  return new Parser(tokens).parseQuery()
}
