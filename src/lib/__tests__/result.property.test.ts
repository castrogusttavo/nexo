import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ErrorCode } from '@/src/errors/codes'
import { err, ok, type Result } from '@/src/lib/result'

const RUNS = { numRuns: 100 }

/** The values services actually carry: DTOs, lists, ids, counts, null. */
const value = () =>
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.string(), { maxLength: 5 }),
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      name: fc.string({ maxLength: 20 }),
      count: fc.nat({ max: 1000 }),
    }),
  )

/** An AppError-shaped failure. */
const appError = () =>
  fc.record({
    code: fc.constantFrom<ErrorCode>(
      'UNAUTHORIZED',
      'FORBIDDEN',
      'RESOURCE_NOT_FOUND',
      'VALIDATION_ERROR',
      'RATE_LIMITED',
      'DATABASE_ERROR',
    ),
    message: fc.string({ maxLength: 40 }),
  })

describe('Result (properties)', () => {
  it('ok() always yields a success carrying exactly the given value', () => {
    fc.assert(
      fc.property(value(), (v) => {
        const result = ok(v)

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(v)
        expect(result).toEqual({ ok: true, value: v })
      }),
      RUNS,
    )
  })

  it('err() always yields a failure carrying exactly the given error', () => {
    fc.assert(
      fc.property(appError(), (e) => {
        const result = err(e)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBe(e)
        expect(result).toEqual({ ok: false, error: e })
      }),
      RUNS,
    )
  })

  it('a result never carries both a value and an error', () => {
    fc.assert(
      fc.property(value(), appError(), (v, e) => {
        expect('error' in ok(v)).toBe(false)
        expect('value' in err(e)).toBe(false)
      }),
      RUNS,
    )
  })

  it('narrowing on `ok` partitions any sequence of results', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(value().map(ok), appError().map(err)), {
          maxLength: 20,
        }),
        (results: Result<unknown>[]) => {
          const successes = results.filter((r) => r.ok)
          const failures = results.filter((r) => !r.ok)

          expect(successes.length + failures.length).toBe(results.length)
          // The narrowed halves expose the matching member and nothing else.
          for (const r of successes) expect('value' in r).toBe(true)
          for (const r of failures) expect('error' in r).toBe(true)
        },
      ),
      RUNS,
    )
  })

  it('the first failure in a chain is the one that propagates', () => {
    // How callers narrow: `if (!result.ok) return result`.
    const chain = (results: Result<unknown>[]): Result<unknown[]> => {
      const values: unknown[] = []
      for (const result of results) {
        if (!result.ok) return result
        values.push(result.value)
      }
      return ok(values)
    }

    fc.assert(
      fc.property(
        fc.array(fc.oneof(value().map(ok), appError().map(err)), {
          maxLength: 20,
        }),
        (results: Result<unknown>[]) => {
          const firstFailure = results.find((r) => !r.ok)
          const outcome = chain(results)

          if (firstFailure) expect(outcome).toBe(firstFailure)
          else
            expect(outcome).toEqual(
              ok(results.map((r) => (r.ok ? r.value : null))),
            )
        },
      ),
      RUNS,
    )
  })
})
