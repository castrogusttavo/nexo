import type { ComponentStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  componentAlertText,
  decideComponentAlert,
  FLAP_TRANSITION_THRESHOLD,
  FLAP_WINDOW_MS,
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
