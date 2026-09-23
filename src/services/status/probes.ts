import 'server-only'
import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { ABACATE_PAY, RESEND_API_KEY } from '@/lib/env/server'
import { auth } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import { ensureRedisConnected } from '@/src/lib/redis'
import { getS3Client } from '@/src/lib/storage/s3'
import { COMPONENTS, type ComponentKey, type ComponentTier } from './components'

export type ProbeStatus = 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE'

export interface ProbeResult {
  status: ProbeStatus
  latencyMs: number
  error: string | null
}

export type ProbeMap = Record<ComponentKey, ProbeResult>

interface ProbeSpec {
  /**
   * Above this, the sample counts as slow. Slow is not an outage and not even
   * a degradation on its own — the collector only records DEGRADED when the
   * slowness persists (see `status.service.ts`).
   */
  slowAboveMs: number
  /** A probe that has not answered by then is a failure, and never hangs the run. */
  timeoutMs: number
}

/**
 * One budget per component, because one budget for all of them was wrong for
 * almost all of them.
 *
 * A single 1.5s threshold used to cover both `SELECT 1` against Postgres on
 * this very machine and an HTTPS call to api.resend.com in the United States.
 * The second is a different physical problem: from São Paulo the round trip
 * alone is ~120ms, and every probe pays a fresh TCP + TLS handshake on top,
 * because a once-a-minute call never finds a warm connection in the pool. The
 * result was an e-mail component reporting 50-73% "uptime" on days when Resend
 * answered every single request correctly.
 *
 * The local budgets are deliberately generous too: the status collector, the
 * CI runner and the 03:15 backup share one machine, so a build can add
 * hundreds of milliseconds to a healthy query. Anything tighter measures our
 * own deploys.
 */
const SPECS: Record<ComponentKey, ProbeSpec> = {
  // A full HTTP round trip through nginx and TLS, from this same host.
  app: { slowAboveMs: 2_500, timeoutMs: 5_000 },
  // `SELECT 1` and `PING` answer in single-digit milliseconds when the pool is
  // warm. A whole second is not "a bit slow", it is something being wrong —
  // and it still has to happen three minutes running to be recorded.
  database: { slowAboveMs: 1_000, timeoutMs: 5_000 },
  cache: { slowAboveMs: 1_000, timeoutMs: 5_000 },
  // Argon2 plus a query: heavier than the two above by design.
  auth: { slowAboveMs: 1_500, timeoutMs: 5_000 },
  storage: { slowAboveMs: 1_500, timeoutMs: 5_000 },
  // Cross-border HTTPS with a cold TLS handshake on every sample.
  payment: { slowAboveMs: 3_000, timeoutMs: 8_000 },
  email: { slowAboveMs: 3_000, timeoutMs: 8_000 },
}

/** Whether a measured latency is above the component's budget. */
export function isSlow(key: ComponentKey, latencyMs: number): boolean {
  return latencyMs > SPECS[key].slowAboveMs
}

const RETRY_DELAY_MS = 250

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Races the work against the component's timeout. The signal is handed to
 * whatever accepts one (fetch, the S3 client); for a driver that ignores it,
 * such as Prisma or ioredis, the race still returns — the query keeps running
 * in the background but the collection is never held hostage by it.
 */
async function withTimeout(
  fn: (signal: AbortSignal) => Promise<unknown>,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    await Promise.race([
      fn(controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          'abort',
          () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
          { once: true },
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Runs one probe and classifies the sample.
 *
 * A failure is retried once, after a short pause, before it becomes an
 * outage: a single reset connection, a dropped packet or a TLS renegotiation
 * is not a service being down, and a status page that declares MAJOR_OUTAGE
 * on one lost packet teaches everyone to ignore it. The latency reported is
 * the attempt that answered (or the last one that tried), never their sum.
 */
async function probe(
  key: ComponentKey,
  fn: (signal: AbortSignal) => Promise<unknown>,
): Promise<ProbeResult> {
  const spec = SPECS[key]
  let firstError: unknown

  for (let attempt = 1; attempt <= 2; attempt++) {
    const start = Date.now()
    try {
      await withTimeout(fn, spec.timeoutMs)
      const latencyMs = Date.now() - start
      return {
        status: latencyMs > spec.slowAboveMs ? 'DEGRADED' : 'OPERATIONAL',
        latencyMs,
        error: null,
      }
    } catch (error) {
      const latencyMs = Date.now() - start
      if (attempt === 2) {
        // The first failure is the one worth reading: the retry often fails
        // with a less specific message (a reused broken socket, an abort).
        return {
          status: 'MAJOR_OUTAGE',
          latencyMs,
          error: messageOf(firstError ?? error),
        }
      }
      firstError = error
      await delay(RETRY_DELAY_MS)
    }
  }

  /* c8 ignore next 2 -- the loop always returns; this satisfies the compiler */
  return { status: 'MAJOR_OUTAGE', latencyMs: 0, error: messageOf(firstError) }
}

/**
 * The web tier as the internet reaches it: DNS, nginx, TLS and the proxy, not
 * just "this process is running". The old probe returned a hard-coded
 * OPERATIONAL/0ms, so the one component nobody could ever see fail was the
 * one serving the status page itself.
 */
export async function probeApp(): Promise<ProbeResult> {
  return probe('app', async (signal) => {
    const res = await fetch(`${NEXT_PUBLIC_URL}/api/health`, {
      signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`App HTTP ${res.status}`)
  })
}

export async function probeDatabase(): Promise<ProbeResult> {
  return probe('database', async () => {
    await prisma.$queryRaw`SELECT 1`
  })
}

export async function probeCache(): Promise<ProbeResult> {
  return probe('cache', async () => {
    const client = await ensureRedisConnected()
    const reply = await client.ping()
    if (reply !== 'PONG') throw new Error(`Unexpected reply: ${reply}`)
  })
}

export async function probeAuth(): Promise<ProbeResult> {
  return probe('auth', async () => {
    await auth.api.getSession({ headers: new Headers() })
  })
}

export async function probeEmail(): Promise<ProbeResult> {
  return probe('email', async (signal) => {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      signal,
    })
    // Same reasoning as the payment probe below: a rejected key is an outage
    // of e-mail delivery even though Resend itself is perfectly healthy.
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Resend rejected our credential (HTTP ${res.status})`)
    }
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}`)
  })
}

/**
 * Storage is checked through the S3 API with our credentials rather than
 * through `/minio/health/live`, which answers 200 to anyone: the health
 * endpoint says the process is alive, `ListBuckets` says we can actually use
 * it. Same lesson the payment probe learned the expensive way. Listing is
 * used instead of `HeadBucket` so the check does not depend on any particular
 * bucket already existing.
 */
export async function probeStorage(): Promise<ProbeResult> {
  return probe('storage', async (signal) => {
    await getS3Client().send(new ListBucketsCommand({}), {
      abortSignal: signal,
    })
  })
}

export async function probePayment(): Promise<ProbeResult> {
  return probe('payment', async (signal) => {
    const res = await fetch(
      'https://api.abacatepay.com/v2/customer/list?limit=1',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${ABACATE_PAY}` },
        signal,
      },
    )
    // A rejected credential used to read as healthy here: the gateway
    // answered, so a liveness check was satisfied. It cost a production
    // checkout answering 502 on every attempt with nothing reporting it --
    // the key had gone invalid and the status page stayed green. From a
    // customer's side an unusable gateway and a down gateway are the same
    // outage, so the probe asks whether we can *use* AbacatePay, not whether
    // it is up.
    if (res.status === 401 || res.status === 403) {
      throw new Error(`AbacatePay rejected our credential (HTTP ${res.status})`)
    }
    if (res.status >= 500) throw new Error(`AbacatePay HTTP ${res.status}`)
  })
}

const PROBES: Record<ComponentKey, () => Promise<ProbeResult>> = {
  app: probeApp,
  database: probeDatabase,
  cache: probeCache,
  auth: probeAuth,
  email: probeEmail,
  storage: probeStorage,
  payment: probePayment,
}

async function runForKeys(
  keys: ReadonlyArray<ComponentKey>,
): Promise<Partial<ProbeMap>> {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await PROBES[key]()] as const),
  )
  return Object.fromEntries(entries) as Partial<ProbeMap>
}

export function componentsForTier(
  tier: ComponentTier,
): ReadonlyArray<ComponentKey> {
  const keys: ComponentKey[] = []
  for (const c of COMPONENTS) {
    if (c.tier === tier) keys.push(c.key)
  }
  return keys
}

export async function runProbesForTier(
  tier: ComponentTier,
): Promise<Partial<ProbeMap>> {
  return runForKeys(componentsForTier(tier))
}
