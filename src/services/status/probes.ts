import 'server-only'
import { ABACATE_PAY, MINIO_ENDPOINT, RESEND_API_KEY } from '@/lib/env/server'
import { auth } from '@/src/lib/auth'
import { prisma } from '@/src/lib/prisma'
import { ensureRedisConnected } from '@/src/lib/redis'
import { COMPONENTS, type ComponentKey, type ComponentTier } from './components'

type ProbeStatus = 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE'

export interface ProbeResult {
  status: ProbeStatus
  latencyMs: number
  error: string | null
}

export type ProbeMap = Record<ComponentKey, ProbeResult>

const TIMEOUT_MS = 5_000
const DEGRADED_THRESHOLD_MS = 1_500

function classify(latencyMs: number): ProbeStatus {
  if (latencyMs > DEGRADED_THRESHOLD_MS) return 'DEGRADED'
  return 'OPERATIONAL'
}

async function timed(fn: () => Promise<void>): Promise<ProbeResult> {
  const start = Date.now()
  try {
    await fn()
    const latencyMs = Date.now() - start
    return { status: classify(latencyMs), latencyMs, error: null }
  } catch (e) {
    const latencyMs = Date.now() - start
    const error = e instanceof Error ? e.message : String(e)
    return { status: 'MAJOR_OUTAGE', latencyMs, error }
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export async function probeApp(): Promise<ProbeResult> {
  return { status: 'OPERATIONAL', latencyMs: 0, error: null }
}

export async function probeDatabase(): Promise<ProbeResult> {
  return timed(async () => {
    await prisma.$queryRaw`SELECT 1`
  })
}

export async function probeCache(): Promise<ProbeResult> {
  return timed(async () => {
    const client = await ensureRedisConnected()
    const reply = await client.ping()
    if (reply !== 'PONG') throw new Error(`Unexpected reply: ${reply}`)
  })
}

export async function probeAuth(): Promise<ProbeResult> {
  return timed(async () => {
    await auth.api.getSession({ headers: new Headers() })
  })
}

export async function probeEmail(): Promise<ProbeResult> {
  return timed(async () => {
    const res = await fetchWithTimeout('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}`)
  })
}

export async function probeStorage(): Promise<ProbeResult> {
  return timed(async () => {
    const res = await fetchWithTimeout(`${MINIO_ENDPOINT}/minio/health/live`)
    if (!res.ok) throw new Error(`MinIO HTTP ${res.status}`)
  })
}

async function probePayment(): Promise<ProbeResult> {
  return timed(async () => {
    const res = await fetchWithTimeout(
      'https://api.abacatepay.com/v2/customer/list?limit=1',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${ABACATE_PAY}` },
      },
    )
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
