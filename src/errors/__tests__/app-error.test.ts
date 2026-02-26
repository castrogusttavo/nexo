import { describe, expect, it } from 'vitest'
import {
  appError,
  badRequest,
  conflict,
  databaseError,
  forbidden,
  invalidCredentials,
  notFound,
  unauthorized,
  validationError,
} from '@/src/errors/app-error'

describe('AppError factories', () => {
  describe('appError()', () => {
    it('should create an error with code and message', () => {
      const error = appError('BAD_REQUEST', 'Something went wrong')

      expect(error).toEqual({
        code: 'BAD_REQUEST',
        message: 'Something went wrong',
      })
    })

    it('should include details when provided', () => {
      const details = { field: 'email' }
      const error = appError('VALIDATION_ERROR', 'Invalid', details)

      expect(error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details,
      })
    })

    it('should omit details when undefined', () => {
      const error = appError('BAD_REQUEST', 'Bad')

      expect(error).not.toHaveProperty('details')
    })
  })

  describe('unauthorized()', () => {
    it('should use default message', () => {
      const error = unauthorized()

      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Não autorizado')
    })

    it('should use custom message', () => {
      const error = unauthorized('Session expired')

      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Session expired')
    })
  })

  describe('invalidCredentials()', () => {
    it('should use default message', () => {
      const error = invalidCredentials()

      expect(error.code).toBe('INVALID_CREDENTIALS')
      expect(error.message).toBe('Credenciais inválidas')
    })
  })

  describe('forbidden()', () => {
    it('should use default message', () => {
      const error = forbidden()

      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('Permissão insuficiente')
    })
  })

  describe('notFound()', () => {
    it('should include resource name in message', () => {
      const error = notFound('User')

      expect(error.code).toBe('RESOURCE_NOT_FOUND')
      expect(error.message).toBe('User not found')
    })
  })

  describe('conflict()', () => {
    it('should use provided message', () => {
      const error = conflict('E-mail já está em uso')

      expect(error.code).toBe('CONFLICT')
      expect(error.message).toBe('E-mail já está em uso')
    })
  })

  describe('validationError()', () => {
    it('should create validation error with details', () => {
      const details = [{ field: 'name', message: 'required' }]
      const error = validationError('Dados inválidos', details)

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Dados inválidos')
      expect(error.details).toEqual(details)
    })

    it('should work without details', () => {
      const error = validationError('Dados inválidos')

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error).not.toHaveProperty('details')
    })
  })

  describe('badRequest()', () => {
    it('should use provided message', () => {
      const error = badRequest('Missing field')

      expect(error.code).toBe('BAD_REQUEST')
      expect(error.message).toBe('Missing field')
    })
  })

  describe('databaseError()', () => {
    it('should use default message', () => {
      const error = databaseError()

      expect(error.code).toBe('DATABASE_ERROR')
      expect(error.message).toBe('Database error')
    })

    it('should use custom message', () => {
      const error = databaseError('Connection failed')

      expect(error.code).toBe('DATABASE_ERROR')
      expect(error.message).toBe('Connection failed')
    })
  })
})
