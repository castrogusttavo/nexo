/**
 * Runs the status collector locally, without the Next server:
 *
 *   pnpm status:collect   one collection of both tiers, prints a table, exits
 *   pnpm status:watch     the same every 60s (like production's cron) until Ctrl+C
 *
 * It calls `StatusService.collect` -- the exact code behind
 * `/api/status/collect/{core,peripheral}` -- against the local `.env`, so it
 * writes HealthCheck / ComponentDaily / incidents to the local database and
 * posts Slack alerts when SLACK_ALERTS_WEBHOOK_URL is set. `server-only` is
 * resolved to the worker's shim through tsconfig.worker.json, as in
 * `pnpm worker:dev`.
 *
 * Exit code: 0 when every tier was collected, 1 otherwise (one-shot mode).
 */
import { logger } from '@/lib/axiom/logger'
import { prisma } from '@/src/lib/prisma'
import { redis } from '@/src/lib/redis'
import {
  type FailedCollect,
  formatCollectReport,
} from '@/src/services/status/collect-report'
import type { ComponentTier } from '@/src/services/status/components'
import {
  type CollectSummary,
  StatusService,
} from '@/src/services/status/status.service'

const INTERVAL_MS = 60_000
const TIERS: ComponentTier[] = ['core', 'peripheral']

const watch = process.argv.includes('--watch')
let stopping = false
let wakeUp: (() => void) | null = null

async function collectOnce(): Promise<boolean> {
  const results: Array<CollectSummary | FailedCollect> = []
  for (const tier of TIERS) {
    const result = await StatusService.collect(tier)
    results.push(
      result.ok
        ? result.value
        : { tier, error: `${result.error.code}: ${result.error.message}` },
    )
  }

  const when = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
  process.stdout.write(
    `\nStatus collected at ${when}\n\n${formatCollectReport(results, {
      color: Boolean(process.stdout.isTTY),
    })}\n\n`,
  )
  return results.every((r) => !('error' in r))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    wakeUp = () => {
      clearTimeout(timer)
      resolve()
    }
  })
}

async function shutdown(code: number): Promise<never> {
  await Promise.allSettled([
    prisma.$disconnect(),
    redis.isOpen ? redis.quit() : Promise.resolve(),
  ])
  await logger.flush()
  process.exit(code)
}

async function main(): Promise<void> {
  if (!watch) {
    const ok = await collectOnce()
    await shutdown(ok ? 0 : 1)
  }

  // First Ctrl+C lets the collection in flight finish (bounded by the probe
  // and Slack timeouts), the second one exits immediately.
  process.on('SIGINT', () => {
    if (stopping) process.exit(130)
    stopping = true
    process.stdout.write('\nStopping after the current collection...\n')
    wakeUp?.()
  })
  process.on('SIGTERM', () => {
    stopping = true
    wakeUp?.()
  })

  process.stdout.write(
    `Collecting every ${INTERVAL_MS / 1000}s. Ctrl+C to stop.\n`,
  )
  while (!stopping) {
    const started = Date.now()
    await collectOnce()
    if (stopping) break
    await sleep(Math.max(0, INTERVAL_MS - (Date.now() - started)))
  }
  await shutdown(0)
}

main().catch(async (error: unknown) => {
  const e = error instanceof Error ? error : new Error(String(error))
  process.stderr.write(`status collector failed: ${e.stack ?? e.message}\n`)
  await shutdown(1)
})
