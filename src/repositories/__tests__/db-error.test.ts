import { describe, expect, it } from 'vitest'
import { dbError } from '../db-error'

describe('dbError()', () => {
  it('returns a DATABASE_ERROR with the given message', () => {
    const result = dbError('Failed to do X', new Error('boom'))

    expect(result.code).toBe('DATABASE_ERROR')
    expect(result.message).toBe('Failed to do X')
  })

  it('handles a non-Error cause', () => {
    const result = dbError('Failed to do Y', 'plain string cause')

    expect(result.code).toBe('DATABASE_ERROR')
  })
})
