import type { ComponentStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/lib/alerts/slack', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/alerts/slack')>()),
  sendSlackAlert: vi.fn().mockResolvedValue(undefined),
}))

import { sendSlackAlert } from '@/src/lib/alerts/slack'
import {
  alertCollectFailed,
  alertCollectRecovered,
  alertComponent,
  componentAlertText,
  decideComponentAlert,
  FLAP_TRANSITION_THRESHOLD,
  FLAP_WINDOW_MS,
  isOutageReminderDue,
  OUTAGE_REMINDER_INTERVAL_MS,
  resetCollectFailureAlert,
  STABLE_PERIOD_MS,
  type StatusPoint,
} from '@/src/services/status/status-alerts'

const MINUTE = 60_000
const T0 = new Date('2026-09-22T12:00:00.000Z').getTime()

/** One check per minute, starting at T0, with the given statuses. */
function series(statuses: ComponentStatus[]): StatusPoint[] {
  return statuses.map((status, i) => ({
    status,
    at: new Date(T0 + i * MINUTE),
  }))
}

const O: ComponentStatus = 'OPERATIONAL'
const D: ComponentStatus = 'DEGRADED'
const M: ComponentStatus = 'MAJOR_OUTAGE'

/** The decision taken at each step, as if the collector ran once per point. */
function decisionsAlong(points: StatusPoint[]) {
  return points.map((_, i) => decideComponentAlert(points.slice(0, i + 1)))
}

describe('decideComponentAlert', () => {
  it('uses the documented thresholds', () => {
    expect(FLAP_TRANSITION_THRESHOLD).toBe(4)
    expect(FLAP_WINDOW_MS).toBe(30 * MINUTE)
    expect(STABLE_PERIOD_MS).toBe(15 * MINUTE)
  })

  it('says nothing without history', () => {
    expect(decideComponentAlert([])).toEqual({ action: 'none' })
    expect(decideComponentAlert(series([M]))).toEqual({ action: 'none' })
  })

  it('says nothing while the state holds, however long', () => {
    const points = series([M, M, M, M, M, M, M, M, M, M])
    for (const decision of decisionsAlong(points)) {
      expect(decision.action).toBe('none')
    }
  })

  it('reports a single change as a transition', () => {
    expect(decideComponentAlert(series([O, O, M]))).toEqual({
      action: 'transition',
    })
  })

  it('reports each of the first three changes in a window, then one "unstable", then silence', () => {
    const actions = decisionsAlong(series([O, D, O, D, O, D, O, D])).map(
      (d) => d.action,
    )
    expect(actions).toEqual([
      'none',
      'transition',
      'transition',
      'transition',
      'unstable',
      'suppressed',
      'suppressed',
      'suppressed',
    ])
  })

  it('announces how many changes made it unstable', () => {
    const decision = decideComponentAlert(series([O, D, O, D, O]))
    expect(decision).toEqual({ action: 'unstable', transitions: 4 })
  })

  it('announces stabilisation once, after the stable period, with the time it settled', () => {
    // Flaps until minute 5, then holds DEGRADED.
    const statuses: ComponentStatus[] = [O, D, O, D, O, D]
    const settledAt = statuses.length - 1
    while (statuses.length < settledAt + 25) statuses.push(D)
    const points = series(statuses)
    const decisions = decisionsAlong(points)

    const stabilized = decisions
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.action === 'stabilized')
    expect(stabilized).toHaveLength(1)
    expect(stabilized[0]?.i).toBe(settledAt + STABLE_PERIOD_MS / MINUTE)
    expect(stabilized[0]?.d).toEqual({
      action: 'stabilized',
      since: new Date(T0 + settledAt * MINUTE),
    })
    // Nothing between the suppressed flaps and the stabilisation.
    for (const d of decisions.slice(settledAt + 1)) {
      expect(['none', 'stabilized']).toContain(d.action)
    }
  })

  it('does not wait for "stable" when the checks skip minutes (crossing, not equality)', () => {
    const points: StatusPoint[] = [
      ...series([O, D, O, D, O]),
      { status: O, at: new Date(T0 + 12 * MINUTE) },
      { status: O, at: new Date(T0 + 25 * MINUTE) },
      { status: O, at: new Date(T0 + 40 * MINUTE) },
    ]
    const actions = decisionsAlong(points).map((d) => d.action)
    expect(actions.slice(5)).toEqual(['none', 'stabilized', 'none'])
  })

  it('treats a change after stabilising as a fresh transition', () => {
    const statuses: ComponentStatus[] = [O, D, O, D, O]
    for (let i = 0; i < 16; i++) statuses.push(O)
    statuses.push(M)
    const decision = decideComponentAlert(series(statuses))
    expect(decision).toEqual({ action: 'transition' })
  })

  it('never calls slow, spaced-out changes unstable', () => {
    const points: StatusPoint[] = []
    for (let i = 0; i < 12; i++) {
      points.push({ status: i % 2 ? D : O, at: new Date(T0 + i * 11 * MINUTE) })
    }
    const actions = decisionsAlong(points).map((d) => d.action)
    expect(actions.slice(1).every((a) => a === 'transition')).toBe(true)
  })

  it('stays suppressed while flapping continues, even past the window', () => {
    const statuses: ComponentStatus[] = []
    for (let i = 0; i < 90; i++) statuses.push(i % 3 === 0 ? D : O)
    const actions = decisionsAlong(series(statuses)).map((d) => d.action)
    expect(actions.filter((a) => a === 'unstable')).toHaveLength(1)
    expect(actions.filter((a) => a === 'transition')).toHaveLength(3)
    expect(actions.filter((a) => a === 'stabilized')).toHaveLength(0)
  })
})

describe('componentAlertText', () => {
  const at = new Date('2026-09-22T17:04:00.000Z') // 14:04 in São Paulo
  const base = {
    componentKey: 'database' as const,
    at,
    incidentStartedAt: null,
    error: null,
  }

  it('describes a component that went down, with the probe error and the status link', () => {
    const text = componentAlertText(
      { action: 'transition' },
      { ...base, from: O, to: M, error: 'connect ECONNREFUSED 10.0.0.5:5432' },
    )
    expect(text).toContain('Banco de dados')
    expect(text).toContain('fora do ar')
    expect(text).toContain('22/09 14:04')
    expect(text).toContain('connect ECONNREFUSED 10.0.0.5:5432')
    expect(text).toContain('https://nexopm.com/status')
  })

  it('calls a degraded component "oscilando"', () => {
    const text = componentAlertText(
      { action: 'transition' },
      { ...base, from: O, to: D },
    )
    expect(text).toContain('oscilando')
  })

  it('names the direction of a severity change', () => {
    expect(
      componentAlertText({ action: 'transition' }, { ...base, from: D, to: M }),
    ).toContain('piorou')
    expect(
      componentAlertText({ action: 'transition' }, { ...base, from: M, to: D }),
    ).toContain('melhorou')
  })

  it('reports a recovery with how long the incident lasted', () => {
    const text = componentAlertText(
      { action: 'transition' },
      {
        ...base,
        from: M,
        to: O,
        incidentStartedAt: new Date(at.getTime() - 12 * MINUTE),
      },
    )
    expect(text).toContain('voltou ao normal')
    expect(text).toContain('12 min')
    expect(text).toContain('13:52')
  })

  it('sends nothing for a suppressed or empty decision', () => {
    expect(
      componentAlertText({ action: 'suppressed' }, { ...base, from: O, to: D }),
    ).toBeNull()
    expect(
      componentAlertText({ action: 'none' }, { ...base, from: O, to: O }),
    ).toBeNull()
  })

  it('explains the pause when the component is unstable', () => {
    const text = componentAlertText(
      { action: 'unstable', transitions: 4 },
      { ...base, from: O, to: D },
    )
    expect(text).toContain('instável')
    expect(text).toContain('4 mudanças de estado em 30 min')
    expect(text).toContain('15 min')
  })

  it('tells whether it settled healthy or broken', () => {
    const since = new Date(at.getTime() - 15 * MINUTE)
    expect(
      componentAlertText(
        { action: 'stabilized', since },
        { ...base, from: O, to: O },
      ),
    ).toContain('estabilizou e está operacional')
    expect(
      componentAlertText(
        { action: 'stabilized', since },
        { ...base, from: M, to: M },
      ),
    ).toContain('estabilizou fora do ar')
  })
})

describe('isOutageReminderDue', () => {
  const HOUR = 60 * MINUTE
  const since = new Date(T0)
  const at = (ms: number) => new Date(T0 + ms)

  it('reminds every six hours of an open incident', () => {
    expect(OUTAGE_REMINDER_INTERVAL_MS).toBe(6 * HOUR)
  })

  it('stays quiet before the first interval has passed', () => {
    expect(
      isOutageReminderDue(since, at(5 * HOUR), at(5 * HOUR + MINUTE)),
    ).toBe(false)
  })

  it('fires once, on the check that crosses each interval', () => {
    expect(
      isOutageReminderDue(since, at(6 * HOUR - MINUTE), at(6 * HOUR)),
    ).toBe(true)
    expect(
      isOutageReminderDue(since, at(6 * HOUR), at(6 * HOUR + MINUTE)),
    ).toBe(false)
    expect(
      isOutageReminderDue(
        since,
        at(12 * HOUR - MINUTE),
        at(12 * HOUR + MINUTE),
      ),
    ).toBe(true)
  })

  it('does not repeat a reminder after a gap in collection', () => {
    expect(
      isOutageReminderDue(since, at(6 * HOUR + MINUTE), at(11 * HOUR)),
    ).toBe(false)
  })
})

describe('componentAlertText - reminder', () => {
  it('says how long the component has been down', () => {
    const since = new Date(T0)
    const text = componentAlertText(
      { action: 'reminder', since },
      {
        componentKey: 'storage',
        from: M,
        to: M,
        at: new Date(T0 + 6 * 60 * MINUTE),
        incidentStartedAt: since,
        error: 'Timed out after 5000ms',
      },
    )
    expect(text).toContain('continua fora do ar há')
    expect(text).toContain('Timed out after 5000ms')
  })
})

describe('componentAlertText - fallbacks', () => {
  const at = new Date('2026-09-22T17:04:00.000Z')
  const base = { at, incidentStartedAt: null, error: null }

  it('reports a recovery without an open incident as resolved at the check time', () => {
    const text = componentAlertText(
      { action: 'transition' },
      { ...base, componentKey: 'database', from: M, to: O },
    )

    expect(text).toContain('voltou ao normal')
    expect(text).toContain('Resolvido em 22/09 14:04')
    expect(text).not.toContain('Ficou')
  })

  it('mentions the open incident on a severity change', () => {
    const text = componentAlertText(
      { action: 'transition' },
      {
        ...base,
        componentKey: 'database',
        from: D,
        to: M,
        incidentStartedAt: new Date(at.getTime() - 30 * MINUTE),
      },
    )

    expect(text).toContain(
      'Mudou às 22/09 14:04 (incidente aberto desde 22/09 13:34)',
    )
  })

  it('falls back to the raw key for a component it does not know', () => {
    const text = componentAlertText(
      { action: 'transition' },
      { ...base, componentKey: 'ghost' as never, from: O, to: M },
    )

    expect(text).toContain('*ghost* está fora do ar')
  })
})

describe('alertComponent', () => {
  const ctx = {
    componentKey: 'database' as const,
    at: new Date('2026-09-22T17:04:00.000Z'),
    incidentStartedAt: null,
    error: null,
    from: O,
    to: M,
  }

  beforeEach(() => {
    vi.mocked(sendSlackAlert).mockClear()
  })

  it.each([
    { action: 'none' as const },
    { action: 'suppressed' as const },
  ])('posts nothing for a $action decision', async (decision) => {
    await alertComponent(decision, ctx)

    expect(sendSlackAlert).not.toHaveBeenCalled()
  })

  it('posts the text under an event named after the decision', async () => {
    await alertComponent({ action: 'transition' }, ctx)

    expect(sendSlackAlert).toHaveBeenCalledWith({
      event: 'status.transition',
      text: componentAlertText({ action: 'transition' }, ctx),
    })
  })
})

describe('collect failure alerts', () => {
  beforeEach(() => {
    resetCollectFailureAlert()
    vi.mocked(sendSlackAlert).mockClear()
  })

  it('posts once while failing, omitting the probe line when there is no probe error', async () => {
    await alertCollectFailed('relation "health_check" does not exist', null)
    await alertCollectFailed('still failing', null)

    expect(sendSlackAlert).toHaveBeenCalledTimes(1)
    const [{ event, text }] = vi.mocked(sendSlackAlert).mock.calls[0] ?? []
    expect(event).toBe('status.collect_failed')
    expect(text).toContain('relation "health_check" does not exist')
    expect(text).not.toContain('Sonda do banco')
  })

  it('includes the database probe error when there is one', async () => {
    await alertCollectFailed('write failed', 'connect ECONNREFUSED')

    const [{ text }] = vi.mocked(sendSlackAlert).mock.calls[0] ?? []
    expect(text).toContain('Sonda do banco: `connect ECONNREFUSED`')
  })

  it('posts the recovery only after a failure, and only once', async () => {
    await alertCollectRecovered()
    expect(sendSlackAlert).not.toHaveBeenCalled()

    await alertCollectFailed('write failed', null)
    await alertCollectRecovered()
    await alertCollectRecovered()

    expect(vi.mocked(sendSlackAlert).mock.calls.map(([a]) => a.event)).toEqual([
      'status.collect_failed',
      'status.collect_recovered',
    ])
  })
})
