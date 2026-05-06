import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from 'rate-limiter-flexible'
import { logger } from '@/lib/axiom/server'
import type { AppError } from '@/src/errors/app-error'
import { rateLimited } from '@/src/errors/app-error'
import { ensureRedisConnected, redis } from '@/src/lib/redis'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'

const AUTH_POINTS = 10
const AUTH_DURATION_SECONDS = 15 * 60
const AUTH_BLOCK_SECONDS = 30 * 60

const EMAIL_POINTS = 5
const EMAIL_DURATION_SECONDS = 60 * 60

const API_POINTS = 100
const API_DURATION_SECONDS = 60

const authInsurance = new RateLimiterMemory({
  points: AUTH_POINTS,
  duration: AUTH_DURATION_SECONDS,
  blockDuration: AUTH_BLOCK_SECONDS,
  keyPrefix: 'rl:auth:mem',
})

export const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  storeType: 'redis',
  useRedisPackage: true,
  keyPrefix: 'rl:auth',
  points: AUTH_POINTS,
  duration: AUTH_DURATION_SECONDS,
  blockDuration: AUTH_BLOCK_SECONDS,
  insuranceLimiter: authInsurance,
})

export const emailLimiter = new RateLimiterRedis({
  storeClient: redis,
  storeType: 'redis',
  useRedisPackage: true,
  keyPrefix: 'rl:email',
  points: EMAIL_POINTS,
  duration: EMAIL_DURATION_SECONDS,
})

export const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  storeType: 'redis',
  useRedisPackage: true,
  keyPrefix: 'rl:api',
  points: API_POINTS,
  duration: API_DURATION_SECONDS,
})

export type Limiter = RateLimiterRedis

const limiterNames = new WeakMap<Limiter, string>([
  [authLimiter, 'auth'],
  [emailLimiter, 'email'],
  [apiLimiter, 'api'],
])

let connectionEnsured: Promise<unknown> | null = null

async function ensureConnection() {
  if (!connectionEnsured) {
    connectionEnsured = ensureRedisConnected().catch((cause) => {
      connectionEnsured = null
      throw cause
    })
  }
  return connectionEnsured
}

export async function consume(
  limiter: Limiter,
  key: string,
  points = 1,
): Promise<Result<void, AppError>> {
  const name = limiterNames.get(limiter) ?? 'unknown'

  try {
    await ensureConnection()
    await limiter.consume(key, points)
    return ok(undefined)
  } catch (cause) {
    if (cause instanceof RateLimiterRes) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(cause.msBeforeNext / 1000),
      )
      logger.warn('rate_limit_violation', {
        limiter: name,
        key,
        retryAfterSeconds,
        consumedPoints: cause.consumedPoints,
      })
      return err(rateLimited(retryAfterSeconds))
    }

    logger.error('rate_limit_store_error', {
      limiter: name,
      key,
      message: cause instanceof Error ? cause.message : String(cause),
    })
    return ok(undefined)
  }
}
