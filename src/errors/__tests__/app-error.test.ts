import { describe, expect, it } from 'vitest'
import {
  appError,
  badRequest,
  conflict,
  databaseError,
  forbidden,
  invalidCredentials,
  notFound,
  projectLabelAlreadyExists,
  projectLabelForbidden,
  projectLabelInvalid,
  projectLabelNotFound,
  projectLabelsDisabled,
  projectStateAlreadyExists,
  projectStateForbidden,
  projectStateInvalid,
  projectStateIsDefault,
  projectStateLastInGroup,
  projectStateNotFound,
  projectStatesDisabled,
  rateLimited,
  unauthorized,
  usernameConflict,
  validationError,
} from '@/src/errors/app-error'
import { ERROR_CODES } from '@/src/errors/codes'

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

  describe('usernameConflict()', () => {
    it('should use default message', () => {
      const error = usernameConflict()

      expect(error.code).toBe('USERNAME_CONFLICT')
      expect(error.message).toBe('Username já está em uso')
    })

    it('should use custom message', () => {
      const error = usernameConflict('Esse @ já foi escolhido')

      expect(error.code).toBe('USERNAME_CONFLICT')
      expect(error.message).toBe('Esse @ já foi escolhido')
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

  describe('rateLimited()', () => {
    it('should expose retryAfterSeconds via details', () => {
      const error = rateLimited(120)

      expect(error.code).toBe('RATE_LIMITED')
      expect(error.message).toBe('Muitas requisições')
      expect(error.details).toEqual({ retryAfterSeconds: 120 })
    })

    it('should accept a custom message', () => {
      const error = rateLimited(60, 'slow down')

      expect(error.message).toBe('slow down')
      expect(
        (error.details as { retryAfterSeconds: number }).retryAfterSeconds,
      ).toBe(60)
    })
  })

  describe('project state factories', () => {
    it.each([
      ['projectStateNotFound', projectStateNotFound(), 404],
      ['projectStateForbidden', projectStateForbidden(), 403],
      ['projectStateAlreadyExists', projectStateAlreadyExists(), 409],
      ['projectStateIsDefault', projectStateIsDefault(), 409],
      ['projectStateLastInGroup', projectStateLastInGroup(), 409],
      ['projectStateInvalid', projectStateInvalid(), 422],
      ['projectStatesDisabled', projectStatesDisabled(), 409],
    ] as const)('%s() maps to a registered %i code', (_, error, status) => {
      expect(ERROR_CODES[error.code].status).toBe(status)
      expect(error.message).not.toBe('')
    })

    it('accepts a custom message', () => {
      expect(projectStateForbidden('Sem acesso').message).toBe('Sem acesso')
    })
  })

  describe('project label factories', () => {
    it.each([
      ['projectLabelNotFound', projectLabelNotFound(), 404],
      ['projectLabelForbidden', projectLabelForbidden(), 403],
      ['projectLabelAlreadyExists', projectLabelAlreadyExists(), 409],
      ['projectLabelInvalid', projectLabelInvalid(), 422],
      ['projectLabelsDisabled', projectLabelsDisabled(), 409],
    ] as const)('%s() maps to a registered %i code', (_, error, status) => {
      expect(ERROR_CODES[error.code].status).toBe(status)
      expect(error.message).not.toBe('')
    })
  })
})
