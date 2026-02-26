import { expect } from 'vitest'
import type { AppError } from '@/src/errors/app-error'
import type { ErrorCode } from '@/src/errors/codes'
import type { Result } from '@/src/lib/result'

export function expectOk<T>(result: Result<T>): T {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('Expected ok result')
  return result.value
}

export function expectErr(
  result: Result<unknown>,
  expectedCode?: ErrorCode,
): AppError {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected err result')
  if (expectedCode) {
    expect(result.error.code).toBe(expectedCode)
  }
  return result.error
}
