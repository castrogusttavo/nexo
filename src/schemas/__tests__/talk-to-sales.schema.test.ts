import { describe, expect, it } from 'vitest'
import { TalkToSalesSchema } from '../talk-to-sales.schema'

const valid = {
  name: 'Ana Silva',
  email: 'ana@empresa.com',
  teamSize: '11-50',
  message: 'Queremos migrar do Jira e avaliar o Enterprise.',
}

describe('TalkToSalesSchema', () => {
  it('access a complete valid payload', () => {
    const result = TalkToSalesSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('trims name and message', () => {
    const result = TalkToSalesSchema.safeParse({
      ...valid,
      name: '  Ana  ',
      message: '  Mensagem com espaços  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Ana')
      expect(result.data.message).toBe('Mensagem com espaços')
    }
  })

  it('rejects invalid email', () => {
    expect(
      TalkToSalesSchema.safeParse({ ...valid, email: 'nope' }).success,
    ).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(
      TalkToSalesSchema.safeParse({ ...valid, teamSize: '9000+' }).success,
    ).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(TalkToSalesSchema.safeParse({ ...valid, name: 'A' }).success).toBe(
      false,
    )
  })

  it('rejects invalid email', () => {
    expect(
      TalkToSalesSchema.safeParse({ ...valid, message: 'curto' }).success,
    ).toBe(false)
  })
})
