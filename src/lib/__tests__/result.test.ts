import { describe, expect, it } from 'vitest'
import { err, ok } from '@/src/lib/result'

describe('Result', () => {
  describe('ok()', () => {
    it('should create an ok result with a value', () => {
      const result = ok(42)

      expect(result.ok).toBe(true)
      expect(result).toEqual({ ok: true, value: 42 })
    })

    it('should work with string values', () => {
      const result = ok('hello')

      expect(result.ok).toBe(true)
      expect(result).toEqual({ ok: true, value: 'hello' })
    })

    it('should work with object values', () => {
      const data = { id: '1', name: 'Test' }
      const result = ok(data)

      expect(result.ok).toBe(true)
      expect(result).toEqual({ ok: true, value: data })
    })

    it('should work with null', () => {
      const result = ok(null)

      expect(result.ok).toBe(true)
      expect(result).toEqual({ ok: true, value: null })
    })
  })

  describe('err()', () => {
    it('should create an err result with an error', () => {
      const error = { code: 'UNAUTHORIZED' as const, message: 'Not authorized' }
      const result = err(error)

      expect(result.ok).toBe(false)
      expect(result).toEqual({ ok: false, error })
    })

    it('should create an err result with details', () => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
        message: 'Invalid input',
        details: { field: 'email' },
      }
      const result = err(error)

      expect(result.ok).toBe(false)
      expect(result).toEqual({ ok: false, error })
    })
  })
})
