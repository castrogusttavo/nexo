import { logger } from '@/lib/axiom/logger'
import { databaseError } from '@/src/errors'
import type { AppError } from '@/src/errors/app-error'

/**
 * Logs the underlying failure and returns a DATABASE_ERROR AppError.
 *
 * Repositories previously swallowed the Prisma error, so a failed query
 * surfaced only as an opaque DATABASE_ERROR. Route every repository catch
 * through this helper so the real cause is always logged.
 */
export function dbError(message: string, cause: unknown): AppError {
  logger.error('repository.database_error', {
    message,
    cause: cause instanceof Error ? cause.message : String(cause),
  })
  return databaseError(message)
}
