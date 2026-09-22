import type { ComponentStatus } from '@prisma/client'
import type { ComponentTier } from './components'
import type { CollectSummary } from './status.service'

/** A tier whose collection returned an error instead of a summary. */
export interface FailedCollect {
  tier: ComponentTier
  error: string
}

const STATUS_COLOR: Record<ComponentStatus, string> = {
  OPERATIONAL: '\u001b[32m',
  MAINTENANCE: '\u001b[34m',
  DEGRADED: '\u001b[33m',
  PARTIAL_OUTAGE: '\u001b[33m',
  MAJOR_OUTAGE: '\u001b[31m',
}
const RESET = '\u001b[0m'
const ERROR_MAX = 120

function oneLine(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > ERROR_MAX ? `${flat.slice(0, ERROR_MAX - 1)}…` : flat
}

/**
 * The table `pnpm status:collect` prints: one row per component, columns
 * aligned on the plain text so ANSI colour codes do not skew them.
 */
export function formatCollectReport(
  results: Array<CollectSummary | FailedCollect>,
  { color }: { color: boolean },
): string {
  const header = ['COMPONENT', 'TIER', 'STATUS', 'LATENCY', 'ERROR']
  const rows: Array<{ cells: string[]; status: ComponentStatus | null }> = []

  for (const result of results) {
    if ('error' in result) {
      rows.push({
        cells: [
          '(all)',
          result.tier,
          'COLLECT_FAILED',
          '-',
          oneLine(result.error),
        ],
        status: 'MAJOR_OUTAGE',
      })
      continue
    }
    for (const c of result.components) {
      rows.push({
        cells: [
          c.componentKey,
          result.tier,
          c.status,
          `${c.latencyMs} ms`,
          c.error ? oneLine(c.error) : '-',
        ],
        status: c.status,
      })
    }
  }

  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r.cells[i]?.length ?? 0)),
  )
  const render = (cells: string[], status: ComponentStatus | null) =>
    cells
      .map((cell, i) => {
        const last = i === cells.length - 1
        // Latency is right-aligned; the last column is not padded.
        const padded = last
          ? cell
          : i === 3
            ? cell.padStart(widths[i] ?? 0)
            : cell.padEnd(widths[i] ?? 0)
        return color && status && i === 2
          ? `${STATUS_COLOR[status]}${padded}${RESET}`
          : padded
      })
      .join('  ')

  return [
    render(header, null),
    ...rows.map((r) => render(r.cells, r.status)),
  ].join('\n')
}
