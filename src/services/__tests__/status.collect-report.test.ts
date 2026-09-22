import { describe, expect, it } from 'vitest'
import { formatCollectReport } from '@/src/services/status/collect-report'
import type { CollectSummary } from '@/src/services/status/status.service'

const core: CollectSummary = {
  tier: 'core',
  collectedAt: '2026-09-22T17:04:05.000Z',
  components: [
    {
      componentKey: 'app',
      name: 'Aplicação',
      status: 'OPERATIONAL',
      latencyMs: 0,
      error: null,
    },
    {
      componentKey: 'database',
      name: 'Banco de dados',
      status: 'MAJOR_OUTAGE',
      latencyMs: 5003,
      error: 'connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap',
    },
  ],
}

describe('formatCollectReport', () => {
  it('prints one aligned row per component with status, latency and error', () => {
    const out = formatCollectReport([core], { color: false })
    const lines = out.split('\n')

    expect(lines[0]).toMatch(/^COMPONENT\s+TIER\s+STATUS\s+LATENCY\s+ERROR$/)
    const app = lines.find((l) => l.startsWith('app'))
    const db = lines.find((l) => l.startsWith('database'))
    expect(app).toMatch(/^app\s+core\s+OPERATIONAL\s+0 ms\s+-$/)
    expect(db).toContain('MAJOR_OUTAGE')
    expect(db).toContain('5003 ms')
    expect(db).toContain(
      'connect ECONNREFUSED 127.0.0.1:5432 at TCPConnectWrap',
    )
    // Columns line up: STATUS starts at the same offset on every row.
    const header = lines[0] ?? ''
    expect(app?.indexOf('OPERATIONAL')).toBe(header.indexOf('STATUS'))
    expect(db?.indexOf('MAJOR_OUTAGE')).toBe(header.indexOf('STATUS'))
  })

  it('reports a tier that failed to collect', () => {
    const out = formatCollectReport(
      [{ tier: 'peripheral', error: 'Failed to record health checks' }],
      { color: false },
    )
    expect(out).toContain('peripheral')
    expect(out).toContain('Failed to record health checks')
  })

  it('colours statuses only when asked to', () => {
    expect(formatCollectReport([core], { color: false })).not.toContain(
      '\u001b[',
    )
    expect(formatCollectReport([core], { color: true })).toContain('\u001b[')
  })
})
