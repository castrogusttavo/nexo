import { describe, expect, it } from 'vitest'
import { rateLimited } from '@/src/errors'
import {
  errorResponse,
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

describe('successResponse()', () => {
  it('should default to status 200 and wrap data in success envelope', async () => {
    const res = successResponse({ id: '1' })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, statusCode: 200, data: { id: '1' } })
  })

  it('should honor custom status code', async () => {
    const res = successResponse({ id: '1' }, 201)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.statusCode).toBe(201)
  })

  it('should include message when provided', async () => {
    const res = successResponse(null, 200, 'Done')
    const body = await res.json()
    expect(body.message).toBe('Done')
  })

  it('should add Cache-Control when cacheOptions provided', () => {
    const res = successResponse({ x: 1 }, 200, undefined, {
      maxAge: 60,
      staleWhileRevalidate: 30,
    })

    expect(res.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=30',
    )
  })

  it('should mark Cache-Control as private when requested', () => {
    const res = successResponse({ x: 1 }, 200, undefined, {
      maxAge: 0,
      private: true,
    })

    expect(res.headers.get('Cache-Control')).toBe(
      'private, max-age=0, stale-while-revalidate=0',
    )
  })
})

describe('errorResponse()', () => {
  it('should build error envelope with code and status', async () => {
    const res = errorResponse('SOMETHING', 500, 'boom')

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({
      success: false,
      statusCode: 500,
      message: 'boom',
      error: { code: 'SOMETHING' },
    })
  })

  it('should include details when provided', async () => {
    const res = errorResponse('VALIDATION_ERROR', 422, 'invalid', [
      { field: 'email' },
    ])
    const body = await res.json()
    expect(body.error.details).toEqual([{ field: 'email' }])
  })
})

describe('standardError()', () => {
  it('should map ErrorCode to status', async () => {
    const res = standardError('RESOURCE_NOT_FOUND', 'no')

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND')
  })

  it('should map VALIDATION_ERROR to 422', () => {
    const res = standardError('VALIDATION_ERROR')
    expect(res.status).toBe(422)
  })

  it('should map FORBIDDEN to 403', () => {
    const res = standardError('FORBIDDEN')
    expect(res.status).toBe(403)
  })
})

describe('handleError()', () => {
  it('should map AppError code to HTTP status and surface message', async () => {
    const res = handleError({
      code: 'CONFLICT',
      message: 'E-mail já está em uso',
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('CONFLICT')
    expect(body.message).toBe('E-mail já está em uso')
  })

  it('should set Retry-After header for RATE_LIMITED with retryAfterSeconds', () => {
    const res = handleError(rateLimited(120))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('120')
  })

  it('should not set Retry-After when retryAfterSeconds is missing/zero', () => {
    const res = handleError({
      code: 'RATE_LIMITED',
      message: 'too many',
      details: {},
    })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeNull()
  })

  it('should propagate validation details', async () => {
    const res = handleError({
      code: 'VALIDATION_ERROR',
      message: 'invalid',
      details: [{ path: ['email'], message: 'required' }],
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.details).toEqual([
      { path: ['email'], message: 'required' },
    ])
  })

  it('should map UNAUTHORIZED to 401', () => {
    const res = handleError({ code: 'UNAUTHORIZED', message: 'no auth' })
    expect(res.status).toBe(401)
  })

  it('should map DATABASE_ERROR to 500', () => {
    const res = handleError({ code: 'DATABASE_ERROR', message: 'boom' })
    expect(res.status).toBe(500)
  })
})
