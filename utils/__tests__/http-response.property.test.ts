import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { AppError } from '@/src/errors/app-error'
import { type ErrorCode, ERROR_CODES } from '@/src/errors/codes'
import {
  errorResponse,
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

const RUNS = { numRuns: 100 }

const ERROR_CODE_KEYS = Object.keys(ERROR_CODES) as ErrorCode[]

const errorCode = () => fc.constantFrom(...ERROR_CODE_KEYS)

/** Statuses the API actually answers success with (204/205 carry no body). */
const successStatus = () => fc.constantFrom(200, 201, 202, 206)

/** A JSON payload shaped like the DTOs the routes return. */
const payload = () =>
  fc.oneof(
    fc.constant(null),
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      title: fc.string({ maxLength: 40 }),
      archived: fc.boolean(),
      order: fc.integer({ min: -1000, max: 1000 }),
    }),
    fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 12 }),
        name: fc.string({ maxLength: 20 }),
      }),
      { maxLength: 5 },
    ),
    fc.record({
      items: fc.array(fc.string({ maxLength: 10 }), { maxLength: 5 }),
      total: fc.nat({ max: 10_000 }),
      nextCursor: fc.option(fc.string({ maxLength: 12 }), { nil: null }),
    }),
  )

const appError = (code: ErrorCode, message: string): AppError => ({
  code,
  message,
})

describe('ERROR_CODES registry (properties)', () => {
  it('every error code maps to a valid client or server HTTP status', () => {
    fc.assert(
      fc.property(errorCode(), (code) => {
        const { status } = ERROR_CODES[code]

        expect(Number.isInteger(status)).toBe(true)
        expect(status).toBeGreaterThanOrEqual(400)
        expect(status).toBeLessThan(600)
      }),
      RUNS,
    )
  })

  it('every registry key is its own code string', () => {
    fc.assert(
      fc.property(errorCode(), (code) => {
        expect(ERROR_CODES[code].code).toBe(code)
      }),
      RUNS,
    )
  })
})

describe('successResponse() (properties)', () => {
  it('always answers with success: true, the status and the given data', async () => {
    await fc.assert(
      fc.asyncProperty(payload(), successStatus(), async (data, status) => {
        const response = successResponse(data, status)

        expect(response.status).toBe(status)
        expect(await response.json()).toEqual({
          success: true,
          statusCode: status,
          data,
        })
      }),
      RUNS,
    )
  })

  it('carries a message only when one is given', async () => {
    await fc.assert(
      fc.asyncProperty(
        payload(),
        fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
        async (data, message) => {
          const body = await successResponse(data, 200, message).json()

          if (message) expect(body.message).toBe(message)
          else expect('message' in body).toBe(false)
        },
      ),
      RUNS,
    )
  })

  it('renders Cache-Control from the cache options it is given', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 86_400 }),
        fc.nat({ max: 86_400 }),
        fc.boolean(),
        (maxAge, staleWhileRevalidate, isPrivate) => {
          const response = successResponse(null, 200, undefined, {
            maxAge,
            staleWhileRevalidate,
            private: isPrivate,
          })

          expect(response.headers.get('Cache-Control')).toBe(
            `${isPrivate ? 'private' : 'public'}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
          )
        },
      ),
      RUNS,
    )
  })
})

describe('standardError() (properties)', () => {
  it('answers every error code with the status the registry maps it to', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCode(),
        fc.option(fc.string({ minLength: 1, maxLength: 40 }), {
          nil: undefined,
        }),
        async (code, message) => {
          const response = standardError(code, message)
          const { status } = ERROR_CODES[code]

          expect(response.status).toBe(status)
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.statusCode).toBe(status)
          if (message) expect(body.message).toBe(message)
        },
      ),
      RUNS,
    )
  })

  it('echoes the error code it was asked for in the body', async () => {
    await fc.assert(
      fc.asyncProperty(errorCode(), async (code) => {
        const body = await standardError(code).json()

        expect(body.error.code).toBe(code)
      }),
      RUNS,
    )
  })
})

describe('handleError() (properties)', () => {
  it('maps any AppError onto its registry status and echoes code and message', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCode(),
        fc.string({ minLength: 1, maxLength: 40 }),
        async (code, message) => {
          const response = handleError(appError(code, message))
          const { status } = ERROR_CODES[code]

          expect(response.status).toBe(status)
          const body = await response.json()
          expect(body).toEqual({
            success: false,
            statusCode: status,
            error: { code },
            message,
          })
        },
      ),
      RUNS,
    )
  })

  it('sets Retry-After only for rate limits with a positive delay', () => {
    fc.assert(
      fc.property(
        errorCode(),
        fc.integer({ min: -10, max: 3600 }),
        (code, seconds) => {
          const response = handleError({
            code,
            message: 'Muitas requisições',
            details: { retryAfterSeconds: seconds },
          })

          const expected =
            code === 'RATE_LIMITED' && seconds > 0 ? String(seconds) : null
          expect(response.headers.get('Retry-After')).toBe(expected)
        },
      ),
      RUNS,
    )
  })
})

describe('errorResponse() (properties)', () => {
  it('never reports success and always echoes the status it was given', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 400, max: 599 }),
        async (code, status) => {
          const response = errorResponse(code, status)

          expect(response.status).toBe(status)
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.statusCode).toBe(status)
          expect(body.error.code).toBe(code)
          expect('data' in body).toBe(false)
        },
      ),
      RUNS,
    )
  })

  it('includes details verbatim whenever details are given', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            field: fc.string({ maxLength: 12 }),
            reason: fc.string({ maxLength: 20 }),
          }),
          fc.array(fc.string({ maxLength: 12 }), { maxLength: 4 }),
        ),
        async (details) => {
          const body = await errorResponse(
            'VALIDATION_ERROR',
            422,
            undefined,
            details,
          ).json()

          expect(body.error.details).toEqual(details)
        },
      ),
      RUNS,
    )
  })
})
